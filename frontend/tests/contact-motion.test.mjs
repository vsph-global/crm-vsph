import test from "node:test";
import assert from "node:assert/strict";
import { selectionIndicator, activityKey, requiredActivityFields, taskStatusLabel, nextTaskCompletion, completionActor, allowedTaskStatuses, canManageTaskDetails, assignableTaskUser, taskEditPatch, localTaskDue, menuFocusIndex, canRescheduleTask } from "../src/components/contact/contactMotionUtils.js";

test("indicator follows actual tab bounds including wrapped rows",()=>{
  assert.deepEqual(selectionIndicator({left:10,top:20},{left:30,bottom:64,width:90}),{x:20,y:41,width:90});
  assert.deepEqual(selectionIndicator({left:10,top:20},{left:10,bottom:108,width:75}),{x:0,y:85,width:75});
  assert.equal(selectionIndicator({left:0,top:0},{width:0}),null);
  assert.equal(selectionIndicator(null,null),null);
});
test("new activity keys distinguish record types and reject missing IDs",()=>{
  assert.equal(activityKey("call",{call_id:"42"}),"call-42");
  assert.equal(activityKey("task",{task_id:"42"}),"task-42");
  assert.equal(activityKey("call",{}),null);
});
test("composer validates only required fields for the current mode",()=>{
  assert.deepEqual(requiredActivityFields("call",{subject:" ",description:""}),{subject:"Enter a call subject or outcome.",description:"Enter call notes."});
  assert.deepEqual(requiredActivityFields("call",{subject:"Call",description:"Notes"}),{});
  assert.deepEqual(requiredActivityFields("task",{subject:""}),{subject:"Enter a task subject."});
  assert.deepEqual(requiredActivityFields("email",{}),{});
});

test("completion follows existing role and task transition boundaries",()=>{
  const t={task_id:"t1",task_user_fk:"u1",task_status:"TODO"};
  const employee={canEdit:true,role:"EMPLOYEE",userId:"u1"};
  assert.equal(nextTaskCompletion(t,employee),"COMPLETED");
  assert.equal(nextTaskCompletion({...t,task_status:"COMPLETED"},employee),"IN_PROGRESS");
  assert.equal(nextTaskCompletion({...t,task_status:"BLOCKED"},employee),null);
  assert.equal(nextTaskCompletion(t,{...employee,userId:"u2"}),null);
  assert.equal(nextTaskCompletion(t,{...employee,canEdit:false}),null);
  assert.equal(nextTaskCompletion({...t,user:{user_role:"ADMIN"}},{canEdit:true,role:"ORG_ADMIN"}),null);
  assert.equal(taskStatusLabel("TODO"),"Pending");
  assert.equal(taskStatusLabel("COMPLETED"),"Completed");
});
test("completion attribution comes from the audit actor, not task owner",()=>{
  const task={task_status:"COMPLETED",user:{user_name:"Assignee"},task_updates:[{previous_status:"COMPLETED",new_status:"COMPLETED",user:{user_name:"Note author"}},{previous_status:"TODO",new_status:"COMPLETED",user:{user_name:"Completing user"}}]};
  assert.equal(completionActor(task),"Completing user");
  assert.equal(completionActor({...task,task_updates:[]}),null);
  assert.equal(completionActor({...task,task_status:"IN_PROGRESS"}),null);
});

test("status dropdown respects employee transitions and task editing permissions",()=>{
  const task={task_id:"t",task_user_fk:"u",task_status:"BLOCKED"};
  const employee={canEdit:true,role:"EMPLOYEE",userId:"u"};
  assert.deepEqual(allowedTaskStatuses(task,employee),["BLOCKED","TODO","IN_PROGRESS"]);
  assert.equal(canManageTaskDetails(task,employee),false);
  assert.deepEqual(allowedTaskStatuses(task,{...employee,userId:"other"}),[]);
  const admin={canEdit:true,role:"ORG_ADMIN"};
  assert.equal(canManageTaskDetails(task,admin),true);
  assert.equal(assignableTaskUser({user_id:"a",user_role:"ADMIN"},"ORG_ADMIN"),false);
  assert.equal(assignableTaskUser({user_id:"a",user_role:"USER",tenant_fk:"other"},"PLATFORM_SUPERADMIN","tenant"),false);
  assert.equal(assignableTaskUser({user_id:"a",user_role:"USER",tenant_fk:"tenant"},"PLATFORM_SUPERADMIN","tenant"),true);
});
test("task editor emits changed fields only and preserves untouched precise due timestamps",()=>{
  const record={task_subject:"Demo",task_description:"Notes",task_priority:"NORMAL",task_user_fk:"u",task_due_date:"2026-11-24T12:03:44.000Z"};
  const draft={subject:"Demo",description:"Notes",priority:"NORMAL",assignee:"u",due:localTaskDue(record.task_due_date)};
  assert.deepEqual(taskEditPatch(record,draft),{});
  assert.deepEqual(taskEditPatch(record,{...draft,subject:" Revised ",priority:"HIGH",assignee:"v",due:""}),{task_subject:"Revised",task_priority:"HIGH",task_user_fk:"v",task_due_date:null});
  assert.throws(()=>taskEditPatch(record,{...draft,subject:" "}),/task subject/);
});

test("menu navigation wraps, handles an unfocused item and ignores other keys", () => {
  assert.equal(menuFocusIndex("ArrowDown",-1,3),0);
  assert.equal(menuFocusIndex("ArrowUp",-1,3),2);
  assert.equal(menuFocusIndex("ArrowDown",2,3),0);
  assert.equal(menuFocusIndex("ArrowUp",0,3),2);
  assert.equal(menuFocusIndex("ArrowDown",0,3),1);
  assert.equal(menuFocusIndex("Home",2,3),0);
  assert.equal(menuFocusIndex("End",0,3),2);
  assert.equal(menuFocusIndex("Enter",0,3),null);
  assert.equal(menuFocusIndex("ArrowDown",-1,0),null);
});

test("employees can only reschedule their own self-assigned open tasks",()=>{
  const access={canEdit:true,role:"EMPLOYEE",userId:"e"};
  const task={task_id:"t",task_user_fk:"e",task_assigned_by_fk:"e",task_status:"TODO"};
  assert.equal(canRescheduleTask(task,access),true);
  assert.equal(canRescheduleTask({...task,task_assigned_by_fk:"manager"},access),false);
  assert.equal(canRescheduleTask({...task,task_user_fk:"other"},access),false);
  assert.equal(canRescheduleTask({...task,task_status:"COMPLETED"},access),false);
  assert.equal(canRescheduleTask(task,{...access,canEdit:false}),false);
});
