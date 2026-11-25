import test from "node:test";
import assert from "node:assert/strict";
import { createContactPreviewStore, PREVIEW_SCENARIOS, PREVIEW_SESSION } from "../src/dev/contactPreviewFixtures.js";

const full=PREVIEW_SCENARIOS[0].id, sparse=PREVIEW_SCENARIOS[1].id, long=PREVIEW_SCENARIOS[2].id, reference=PREVIEW_SCENARIOS[3].id;
const make=()=>{const store=createContactPreviewStore({now:()=>"2026-11-24T12:00:00.000Z"});store.setDelay(0);return store;};

test("seeded scenarios expose production-shaped responses without credentials",async()=>{
  const s=make(), detail=await s.request("GET","/api/contacts/"+full);
  assert.equal(detail.data.contact_firstname,"Priya");
  assert.equal(detail.data.contact_owner.user_name,"Arjun Mehta");
  assert.equal(detail.data.opportunities.length,2);
  assert.equal((await s.request("GET","/api/calls?contact_id="+full)).length,2);
  assert.equal((await s.request("GET","/api/tasks?contact_id="+full)).data.length,2);
  assert.equal((await s.request("GET","/api/calls?contact_id="+sparse)).length,0);
  assert.equal((await s.request("GET","/api/contacts/"+sparse)).data.contact_professional_email,undefined);
  assert.equal((await s.request("GET","/api/calls?contact_id="+long)).length,8);
  const referenceContact=(await s.request("GET","/api/contacts/"+reference)).data;
  assert.equal(referenceContact.contact_code,"CON-000003");
  assert.equal(referenceContact.contact_call_status,"CONNECTED");
  assert.equal(referenceContact.contact_professional_email,"rakesh@example.com");
  assert.equal((await s.request("GET","/api/calls?contact_id="+reference)).length,0);
  assert.equal((await s.request("GET","/api/tasks?contact_id="+reference)).data.length,0);
  assert.equal(PREVIEW_SESSION.vsph_auth_token,undefined);
});
test("call and task writes persist only in the selected contact",async()=>{
  const s=make();
  const c=await s.request("POST","/api/calls",{call_contact_fk:full,call_subject:"Demo",call_description:"Mock notes"});
  assert.ok(c.call_id);
  assert.equal(c.call_created_at,"2026-11-24T12:00:00.000Z");
  const t=await s.request("POST","/api/tasks",{task_contact_fk:full,task_subject:"Follow up",task_priority:"HIGH"});
  assert.equal(t.success,true);
  assert.equal((await s.request("GET","/api/calls?contact_id="+full)).length,3);
  assert.equal((await s.request("GET","/api/tasks?contact_id="+full)).data.length,3);
  assert.equal((await s.request("GET","/api/tasks?contact_id="+sparse)).data.length,0);
});
test("editing and campaign assignment derive relationships, and reset restores seed",async()=>{
  const s=make();
  const options=await s.request("GET","/api/campaigns?limit=1&page=2");
  const campaign=options.data[0];
  assert.equal(options.pagination.totalRecords,2);
  assert.equal((await s.request("PUT","/api/contacts/"+full,{contact_firstname:"Edited",contact_campaign_fk:campaign.campaign_id})).success,true);
  assert.equal((await s.request("GET","/api/contacts/"+full)).data.contact_campaign.campaign_name,campaign.campaign_name);
  s.reset();s.setDelay(0);
  assert.equal((await s.request("GET","/api/contacts/"+full)).data.contact_firstname,"Priya");
});
test("creation, deletion, pagination, and search operate on the fixture",async()=>{
  const s=make(), result=await s.request("POST","/api/contacts",{contact_firstname:"Demo",contact_lastname:"Record"});
  assert.equal(result.success,true);
  assert.equal((await s.request("GET","/api/contacts?limit=2")).pagination.totalRecords,5);
  assert.equal((await s.request("GET","/api/search?q=Demo")).length,1);
  assert.equal((await s.request("DELETE","/api/contacts/"+result.data.contact_id)).success,true);
  assert.equal((await s.request("GET","/api/contacts/"+result.data.contact_id)).success,false);
});
test("one-shot failure rejects mutations without changing data",async()=>{
  const s=make(), payload={call_contact_fk:full,call_subject:"Test",call_description:"Notes"};
  s.failNextWrite();
  assert.equal((await s.request("GET","/api/contacts/"+full)).success,true);
  assert.equal((await s.request("POST","/api/calls",payload)).success,false);
  assert.equal((await s.request("GET","/api/calls?contact_id="+full)).length,2);
  assert.ok((await s.request("POST","/api/calls",payload)).call_id);
});
test("unsupported endpoints fail closed; response mutations do not mutate store",async()=>{
  const s=make(), item=await s.request("GET","/api/contacts/"+full);
  item.data.contact_firstname="Corrupted";
  assert.equal((await s.request("GET","/api/contacts/"+full)).data.contact_firstname,"Priya");
  assert.equal((await s.request("GET","/api/unknown")).success,false);
  await assert.rejects(s.request("GET","https://example.com/api/contacts"),/Unsupported preview endpoint/);
});
test("reset invalidates in-flight writes",async()=>{
  const s=make();s.setDelay(10);
  const pending=s.request("DELETE","/api/contacts/"+full);
  s.reset();s.setDelay(0);
  assert.equal((await pending).success,false);
  assert.equal((await s.request("GET","/api/contacts/"+full)).success,true);
});

test("task completion persists, records the audit actor and supports reopening",async()=>{
  const s=make(), path="/api/tasks/preview-task-2";
  assert.equal((await s.request("GET",path)).data.task_status,"TODO");
  s.failNextWrite();
  assert.equal((await s.request("PATCH",path,{task_status:"COMPLETED"})).success,false);
  assert.equal((await s.request("GET",path)).data.task_status,"TODO");
  const completed=(await s.request("PATCH",path,{task_status:"COMPLETED"})).data;
  assert.equal(completed.task_status,"COMPLETED");
  assert.equal(completed.task_completed_at,"2026-11-24T12:00:00.000Z");
  assert.equal(completed.task_updates[0].user.user_name,"Arjun Mehta");
  assert.equal(completed.task_updates[0].previous_status,"TODO");
  assert.equal(completed.task_progress,0);
  const list=(await s.request("GET","/api/tasks?contact_id="+full)).data;
  assert.equal(list.find(t=>t.task_id===completed.task_id).task_status,"COMPLETED");
  assert.equal(list.find(t=>t.task_id===completed.task_id).task_updates,undefined);
  assert.equal((await s.request("GET",path)).data.task_updates.length,1);
  const reopened=(await s.request("PATCH",path,{task_status:"IN_PROGRESS"})).data;
  assert.equal(reopened.task_completed_at,null);
  assert.equal(reopened.task_updates.length,2);
  assert.equal((await s.request("PATCH",path,{task_status:"INVALID"})).success,false);
  assert.equal((await s.request("GET",path)).data.task_status,"IN_PROGRESS");
});

test("task detail edits persist without altering status, progress or audit history",async()=>{
  const s=make(),path="/api/tasks/preview-task-2";
  assert.equal((await s.request("GET","/api/users")).data.length,2);
  s.failNextWrite();
  assert.equal((await s.request("PATCH",path,{task_subject:"Edited"})).success,false);
  assert.equal((await s.request("GET",path)).data.task_subject,"Schedule product demonstration");
  const changed=(await s.request("PATCH",path,{task_subject:"Edited",task_description:"Updated notes",task_priority:"HIGH",task_due_date:null,task_user_fk:"preview-user-2"})).data;
  assert.equal(changed.task_subject,"Edited");
  assert.equal(changed.user.user_name,"Maya Rao");
  assert.equal(changed.task_status,"TODO");
  assert.equal(changed.task_updates.length,0);
  assert.equal((await s.request("PATCH",path,{task_user_fk:"unknown"})).success,false);
  assert.equal((await s.request("GET",path)).data.task_user_fk,"preview-user-2");
});

test("manual entries are isolated and follow-up creation is linked and atomic in preview",async()=>{
  const s=make();
  const entry=await s.request("POST","/api/contacts/"+full+"/activities",{entry_kind:"NOTE",entry_subject:"Budget",entry_description:"Annual contracts preferred"});
  assert.ok(entry.data.entry_id);
  assert.equal((await s.request("GET","/api/contacts/"+full+"/activities")).data.length,1);
  assert.equal((await s.request("GET","/api/contacts/"+sparse+"/activities")).data.length,0);
  const payload={call_contact_fk:full,call_subject:"Follow up call",call_description:"Discussed requirements",call_outcome:"CONNECTED"};
  const bad=await s.request("POST","/api/calls",{...payload,followup:{subject:"",due:"invalid",assignee:"invalid"}});
  assert.equal(bad.success,false);
  assert.equal((await s.request("GET","/api/calls?contact_id="+full)).length,2);
  const result=await s.request("POST","/api/calls",{...payload,followup:{subject:"Send quote",due:"2026-11-27T12:00:00Z",assignee:"preview-user-2"}});
  assert.equal(result.followup_task.task_call_fk,result.call_id);
  assert.equal(result.followup_task.task_contact_fk,full);
  assert.equal((await s.request("GET","/api/tasks?contact_id="+full)).data.length,3);
});

test("relationship and commercial records update independently and stay contact scoped",async()=>{
  const s=make();
  assert.equal((await s.request("PATCH","/api/contacts/"+full+"/relationship",{contact_relationship_stage:"QUALIFIED"})).success,true);
  assert.equal((await s.request("GET","/api/contacts/"+full)).data.contact_relationship_stage,"QUALIFIED");
  const payload={opportunity_name:"New deal",opportunity_close_date:"2026-12-30",opportunity_stage:"FOLLOW_UP",opportunity_value:"50000.00",opportunity_currency:"INR",opportunity_next_step:"Send quote"};
  const created=await s.request("POST","/api/contacts/"+full+"/opportunities",payload);
  assert.ok(created.data.opportunity_id);
  assert.equal((await s.request("PATCH","/api/contacts/"+sparse+"/opportunities/"+created.data.opportunity_id,payload)).success,false);
  assert.equal((await s.request("PATCH","/api/contacts/"+full+"/opportunities/"+created.data.opportunity_id,{...payload,opportunity_next_step:"Review quote"})).data.opportunity_next_step,"Review quote");
  assert.equal((await s.request("GET","/api/contacts/"+sparse)).data.opportunities.length,0);
});

test("correction is revision checked, soft deleted and contact scoped; DNC is explicit",async()=>{
  const s=make(), url="/api/contacts/"+full+"/activities";
  const created=await s.request("POST",url,{entry_kind:"NOTE",entry_subject:"Original",entry_description:"Original note"});
  const id=created.data.entry_id, patch={entry_revision:0,entry_subject:"Corrected",entry_description:"Corrected note",entry_occurred_at:created.data.entry_occurred_at};
  assert.equal((await s.request("PATCH","/api/contacts/"+sparse+"/activities/"+id,patch)).success,false);
  const result=await s.request("PATCH",url+"/"+id,patch);
  assert.equal(result.data.entry_revision,1);
  assert.equal(result.data.entry_audit[0].previous.subject,"Original");
  assert.equal((await s.request("PATCH",url+"/"+id,patch)).success,false);
  assert.equal((await s.request("DELETE",url+"/"+id)).success,true);
  assert.equal((await s.request("GET",url)).data.length,0);
  const call={call_contact_fk:full,call_subject:"Preference",call_description:"Do not call",call_outcome:"DNC"};
  const original=(await s.request("GET","/api/contacts/"+full)).data.contact_call_status;
  await s.request("POST","/api/calls",call);
  assert.equal((await s.request("GET","/api/contacts/"+full)).data.contact_call_status,original);
  await s.request("POST","/api/calls",{...call,mark_do_not_call:true});
  assert.equal((await s.request("GET","/api/contacts/"+full)).data.contact_call_status,"DNC");
});
