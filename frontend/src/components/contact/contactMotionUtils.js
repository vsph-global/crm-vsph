export function selectionIndicator(container, selected) {
  if (!container || !selected || selected.width <= 0) return null;
  return { x: selected.left - container.left, y: selected.bottom - container.top - 3, width: selected.width };
}
export function activityKey(kind, record) {
  const id = kind === "call" ? record?.call_id : kind === "task" ? record?.task_id : record?.entry_id;
  return id ? kind + "-" + id : null;
}
export function requiredActivityFields(mode, draft) {
  if (mode !== "call" && mode !== "task") return {};
  const errors = {};
  if (!draft.subject?.trim()) errors.subject = mode === "call" ? "Enter a call subject or outcome." : "Enter a task subject.";
  if (mode === "call" && !draft.description?.trim()) errors.description = "Enter call notes.";
  return errors;
}

// The backend's status enum uses TODO, not the display label Pending.
export function taskStatusLabel(status) {
  return ({TODO:"Pending",PENDING:"Pending",IN_PROGRESS:"In progress",BLOCKED:"Blocked",COMPLETED:"Completed"})[status] || "Unknown status";
}
const TASK_STATES=["TODO","IN_PROGRESS","BLOCKED","COMPLETED"];
const EMPLOYEE_MOVES={TODO:["IN_PROGRESS","BLOCKED","COMPLETED"],IN_PROGRESS:["TODO","BLOCKED","COMPLETED"],BLOCKED:["TODO","IN_PROGRESS"],COMPLETED:["IN_PROGRESS"]};
export function canManageTaskDetails(task,{canEdit,role}) {
  if(!canEdit||!task?.task_id||!["ORG_ADMIN","ORG_SUPER_ADMIN","PLATFORM_SUPERADMIN"].includes(role))return false;
  return !(role==="ORG_ADMIN"&&(task.user?.user_role==="ADMIN"||task.user?.user_role==="SUPER_ADMIN"||task.user?.user_is_tenant_owner));
}
export function canRescheduleTask(task,access){
  return Boolean(access.canEdit&&access.role==="EMPLOYEE"&&access.userId&&task?.task_user_fk===access.userId&&task.task_assigned_by_fk===access.userId&&task.task_status!=="COMPLETED");
}
export function allowedTaskStatuses(task,access) {
  if(!access.canEdit||!task?.task_id||!TASK_STATES.includes(task.task_status))return [];
  if(access.role==="EMPLOYEE")return access.userId&&task.task_user_fk===access.userId ? [task.task_status,...EMPLOYEE_MOVES[task.task_status]] : [];
  return canManageTaskDetails(task,access)?TASK_STATES:[];
}
export function nextTaskCompletion(task,access) {
  const next=task?.task_status==="COMPLETED"?"IN_PROGRESS":"COMPLETED";
  return allowedTaskStatuses(task,access).includes(next)?next:null;
}
export function assignableTaskUser(user,role,tenantId) {
  if(!user?.user_id||user.user_status===false||user.user_role==="SUPER_ADMIN"||user.user_is_tenant_owner)return false;
  if(tenantId&&user.tenant_fk!==tenantId)return false;
  if(role==="PLATFORM_SUPERADMIN"&&!tenantId)return false;
  return user.user_role!=="ADMIN"||role==="ORG_SUPER_ADMIN"||role==="PLATFORM_SUPERADMIN";
}
export function localTaskDue(value) {
  if(!value)return "";
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return "";
  const pad=n=>String(n).padStart(2,"0");
  return date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate())+"T"+pad(date.getHours())+":"+pad(date.getMinutes());
}
export function taskEditPatch(record,draft) {
  if(!draft.subject.trim())throw new Error("Enter a task subject.");
  if(!["LOW","NORMAL","HIGH"].includes(draft.priority))throw new Error("Choose a valid priority.");
  const patch={};
  if(draft.subject.trim()!==(record.task_subject||""))patch.task_subject=draft.subject.trim();
  if(draft.description!==(record.task_description||""))patch.task_description=draft.description;
  if(draft.priority!==(record.task_priority||"NORMAL"))patch.task_priority=draft.priority;
  if(draft.assignee!==(record.task_user_fk||"")) {
    if(!draft.assignee)throw new Error("Choose an assignee.");
    patch.task_user_fk=draft.assignee;
  }
  if(draft.due!==localTaskDue(record.task_due_date)) {
    const due=draft.due?new Date(draft.due):null;
    if(due&&!Number.isFinite(due.getTime()))throw new Error("Enter a valid due date and time.");
    patch.task_due_date=due?due.toISOString():null;
  }
  return patch;
}
export function completionActor(task) {
  if (task?.task_status!=="COMPLETED") return null;
  // Task detail/update returns audit entries newest first. Never substitute
  // the assignee or current viewer for the actual completing user.
  return task.task_updates?.find(update=>update.new_status==="COMPLETED" && update.previous_status!=="COMPLETED")?.user?.user_name || null;
}

export function menuFocusIndex(key, index, count) {
  if (count <= 0) return null;
  switch (key) {
    case "Home": return 0;
    case "End": return count - 1;
    case "ArrowDown": return (index + 1) % count;
    case "ArrowUp": return index <= 0 ? count - 1 : index - 1;
    default: return null;
  }
}
