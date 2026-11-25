import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { api } from "../../utils/api";
import Modal from "../ui/Modal";
import { SaveGlyph } from "./ContactMotion";
import { useDialogExit } from "./useDialogExit";
import { allowedTaskStatuses, assignableTaskUser, localTaskDue, taskEditPatch, taskStatusLabel, menuFocusIndex, canRescheduleTask } from "./contactMotionUtils.js";

export function TaskStatusControl({record,access,busy,onStatus}) {
  const options=allowedTaskStatuses(record,access);
  const [open,setOpen]=useState(false);
  const root=useRef(null), trigger=useRef(null), menu=useRef(null), id=useId();
  const optionNodes=()=>Array.from(menu.current?.querySelectorAll("button")||[]);
  function show(last=false){if(busy)return;setOpen(true);requestAnimationFrame(()=>{const nodes=optionNodes();nodes[last?nodes.length-1:0]?.focus();});}
  function keys(event) {
    if (!open) return;
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    const nodes = optionNodes();
    const next = menuFocusIndex(event.key, nodes.indexOf(document.activeElement), nodes.length);
    if (next !== null) {
      event.preventDefault();
      nodes[next]?.focus();
    }
  }
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};
    const escape=e=>{if(e.key==="Escape"){setOpen(false);trigger.current?.focus();}};
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[open]);
  const label=taskStatusLabel(record.task_status);
  if(!options.length)return <span className="cw-task-status" data-status={record.task_status} role="status">{label}</span>;
  return <div className="cw-task-status-anchor cw-menu-anchor" ref={root} onKeyDown={keys}>
    <button ref={trigger} type="button" className="cw-task-status cw-task-status-trigger" data-status={record.task_status} aria-label={"Change status: "+record.task_subject} aria-haspopup="menu" aria-expanded={open&&!busy} aria-controls={id} aria-disabled={busy} onClick={()=>{if(!busy){if(open)setOpen(false);else show();}}} onKeyDown={e=>{if(!open&&["ArrowDown","ArrowUp"].includes(e.key)){e.preventDefault();e.stopPropagation();show(e.key==="ArrowUp");}}}><span role="status">{label}</span><ChevronDown size={14} aria-hidden="true"/></button>
    <div ref={menu} id={id} role="menu" aria-label="Task status" className="cw-menu cw-status-menu" data-align="left" data-open={open&&!busy} inert={!open||busy} aria-hidden={!open||busy}>
      {options.map(status=><button type="button" key={status} role="menuitemradio" tabIndex={-1} aria-checked={status===record.task_status} onClick={()=>{setOpen(false);trigger.current?.focus();if(status!==record.task_status)onStatus(record,status);}}><span className="cw-task-status" data-status={status}>{taskStatusLabel(status)}</span>{status===record.task_status&&<Check size={16} className="cw-status-selected" aria-hidden="true"/>}</button>)}
    </div>
  </div>;
}

export function ContactTaskEditor({record,access,onClose,onSave}) {
  const rescheduleOnly=canRescheduleTask(record,access);
  const [draft,setDraft]=useState(()=>({subject:record.task_subject||"",description:record.task_description||"",priority:record.task_priority||"NORMAL",due:localTaskDue(record.task_due_date),assignee:record.task_user_fk||""}));
  const [users,setUsers]=useState([]), [loadingUsers,setLoadingUsers]=useState(true), [userError,setUserError]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const lock=useRef(false), formId=useId();
  const {closing,close}=useDialogExit(onClose);
  useEffect(()=>{
    if(rescheduleOnly)return;
    let active=true;
    api.get("/api/users?limit=100").then(result=>{
      if(!result.success||!Array.isArray(result.data))throw new Error("Could not load assignees.");
      if(active)setUsers(result.data.filter(user=>assignableTaskUser(user,access.role,record.tenant_fk)));
    }).catch(e=>{if(active)setUserError(e.message||"Could not load assignees.");}).finally(()=>{if(active)setLoadingUsers(false);});
    return ()=>{active=false;};
  },[access.role,record.tenant_fk,rescheduleOnly]);
  const set=(key,value)=>setDraft(prev=>({...prev,[key]:value}));
  async function submit(e){
    e.preventDefault();if(lock.current||closing)return;
    setError("");lock.current=true;setBusy(true);
    try{
      const patch=rescheduleOnly?(draft.due===localTaskDue(record.task_due_date)?{}:{task_due_date:draft.due?new Date(draft.due).toISOString():null}):taskEditPatch(record,draft);
      if(patch.task_user_fk&&!users.some(user=>user.user_id===patch.task_user_fk))throw new Error("Choose an available assignee.");
      if(Object.keys(patch).length)await onSave(record,patch);
      close();
    }catch(err){setError(err.message||"Could not save task. Try again.");}
    finally{lock.current=false;setBusy(false);}
  }
  return <Modal isOpen workspaceMotion busy={busy} closing={closing} onClose={()=>{if(!lock.current)close();}} title={rescheduleOnly?"Reschedule task":"Edit task"} footer={<><button type="button" className="cw-button" disabled={busy||closing} onClick={close}>Cancel</button><button type="submit" form={formId} className="cw-button cw-primary cw-save-button" data-state={busy?"pending":"idle"} disabled={busy||closing}><SaveGlyph state={busy?"pending":"idle"}/>{busy?"Saving…":"Save changes"}</button></>}>
    <form id={formId} className="cw-form cw-task-edit-form" onSubmit={submit} aria-busy={busy} noValidate>
      <fieldset className="cw-form-fields" disabled={busy||closing}>
        {!rescheduleOnly&&<><label>Task subject<input required autoFocus value={draft.subject} onChange={e=>set("subject",e.target.value)}/></label>
        <label>Description<textarea rows={4} value={draft.description} onChange={e=>set("description",e.target.value)}/></label>
        <label>Priority<select value={draft.priority} onChange={e=>set("priority",e.target.value)}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option></select></label></>}
        <label>Due date and time<input type="datetime-local" autoFocus={rescheduleOnly} value={draft.due} onChange={e=>set("due",e.target.value)}/></label>
        {!rescheduleOnly&&<><label>Assignee<select value={draft.assignee} disabled={loadingUsers||!!userError||!users.length} onChange={e=>set("assignee",e.target.value)}>
          {!users.some(user=>user.user_id===record.task_user_fk)&&<option value={record.task_user_fk||""}>{record.user?.user_name||"Current assignee"}</option>}
          {users.map(user=><option key={user.user_id} value={user.user_id}>{user.user_name}</option>)}
        </select></label>
        {userError&&<p className="cw-muted" role="status">{userError} Existing assignment will be preserved.</p>}</>}
      </fieldset>
      {error&&<p role="alert" className="cw-error">{error}</p>}
    </form>
  </Modal>;
}
