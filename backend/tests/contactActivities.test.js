import test from "node:test";
import assert from "node:assert/strict";
import { validateContactEntry, validateFollowup, CALL_OUTCOMES, validateLinkedOpportunity, RELATIONSHIP_STAGES } from "../src/lib/contactActivities.js";

test("manual entry rejects invalid type, missing text and future time",()=>{
  const body={entry_kind:"NOTE",entry_subject:"Budget",entry_description:"Annual contract"};
  const now=Date.parse("2026-11-24T12:00:00Z");
  assert.equal(validateContactEntry(body,now).data.entry_occurred_at.toISOString(),"2026-11-24T12:00:00.000Z");
  assert.ok(validateContactEntry({...body,entry_kind:"CALL"},now).error);
  assert.ok(validateContactEntry({...body,entry_description:" "},now).error);
  assert.ok(validateContactEntry({...body,entry_occurred_at:"2026-11-25"},now).error);
  assert.ok(CALL_OUTCOMES.includes("DNC"));
});
test("follow-up validates explicit assignee, subject and due date",()=>{
  const body={subject:" Send quote ",assignee:"u1",due:"2026-11-25T12:00:00Z"};
  assert.equal(validateFollowup(body).data.task_subject,"Send quote");
  assert.ok(validateFollowup({...body,assignee:""}).error);
  assert.ok(validateFollowup({...body,due:"invalid"}).error);
});

test("commercial data is optional, precise, and independently validated",()=>{
  const body={opportunity_name:"Renewal",opportunity_close_date:"2026-12-30",opportunity_stage:"FOLLOW_UP",opportunity_value:"12345.67",opportunity_currency:"inr",opportunity_next_step:"Send quote"};
  const valid=validateLinkedOpportunity(body);
  assert.equal(valid.data.opportunity_value,"12345.67");
  assert.equal(valid.data.opportunity_currency,"INR");
  assert.equal(validateLinkedOpportunity({...body,opportunity_value:"",opportunity_currency:""}).data.opportunity_value,null);
  assert.ok(validateLinkedOpportunity({...body,opportunity_close_date:"2026-02-30"}).error);
  assert.ok(validateLinkedOpportunity({...body,opportunity_value:"-1"}).error);
  assert.ok(validateLinkedOpportunity({...body,opportunity_value:"1.001"}).error);
  assert.ok(validateLinkedOpportunity({...body,opportunity_stage:"PROPOSAL"}).error);
  assert.ok(RELATIONSHIP_STAGES.includes("QUALIFIED"));
});
