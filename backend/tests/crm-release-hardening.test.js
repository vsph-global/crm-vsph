import test from "node:test";
import assert from "node:assert/strict";
import { opportunityWrite, callWrite } from "../src/lib/crmWrites.js";
import { canRescheduleOwnTask, assertEmployeeTaskPatch } from "../src/lib/tasks.js";

test("legacy call writes exclude tenant, attribution, relations and deletion fields",()=>{
  assert.deepEqual(callWrite({call_subject:" Corrected ",call_outcome:"CONNECTED",tenant_fk:"foreign",call_user_fk:"other",call_contact_fk:"foreign",call_deleted_at:"2026-01-01"}).data,{call_subject:"Corrected",call_outcome:"CONNECTED"});
  assert.ok(callWrite({call_outcome:"INVALID"}).error);
});
test("opportunity writes exclude tenant and nested relation mutation, preserve nullable commercial fields",()=>{
  const existing={opportunity_name:"Deal",opportunity_owner_fk:"u1",opportunity_close_date:new Date("2026-12-30")};
  assert.deepEqual(opportunityWrite({tenant_fk:"foreign",opportunity_id:"other",opportunity_owner:{connect:{user_id:"foreign"}},opportunity_next_step:"Review"},existing).data,{opportunity_next_step:"Review"});
  assert.deepEqual(opportunityWrite({opportunity_value:"",opportunity_currency:""},existing).data,{opportunity_value:null,opportunity_currency:null});
  assert.ok(opportunityWrite({opportunity_value:"-1",opportunity_currency:"INR"},existing).error);
  assert.ok(opportunityWrite({opportunity_stage:"INVALID"},existing).error);
  assert.ok(opportunityWrite({opportunity_owner_fk:""},existing).error);
});
test("self-created open tasks may be rescheduled but assignment and manager-set due dates remain protected",()=>{
  const actor={id:"e",role:"SALES"}, task={task_user_fk:"e",task_assigned_by_fk:"e",task_status:"TODO"};
  assert.equal(canRescheduleOwnTask(actor,task),true);
  assert.equal(canRescheduleOwnTask(actor,{...task,task_assigned_by_fk:"manager"}),false);
  assert.equal(canRescheduleOwnTask(actor,{...task,task_status:"COMPLETED"}),false);
  assert.equal(canRescheduleOwnTask(actor,{...task,task_user_fk:"other"}),false);
  assert.equal(assertEmployeeTaskPatch({task_due_date:"2026-11-30"},true).ok,true);
  assert.equal(assertEmployeeTaskPatch({task_due_date:"2026-11-30"},false).ok,false);
  assert.equal(assertEmployeeTaskPatch({task_due_date:"2026-11-30",task_user_fk:"other"},true).ok,false);
  assert.equal(assertEmployeeTaskPatch({tenant_fk:"foreign"},true).ok,false);
});
