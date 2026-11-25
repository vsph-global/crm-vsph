import { useEffect, useId, useRef, useState } from "react";
import { api } from "../../utils/api";
import { ActivityComposerDialog } from "./ActivityComposerDialog";
import { assignableTaskUser, localTaskDue } from "./contactMotionUtils.js";
import { humanize } from "./contactWorkspaceUtils.js";

const outcomes=["CONNECTED","NOT_CONNECTED","RINGING","NOT_AVAILABLE","PITCH_DONE","NOT_INTERESTED","NOT_RELEVANT","LEFT_ORGANIZATION","WRONG_NUMBER","DNC"];

export function TaskAssigneeField({draft,setDraft,role,tenantId}) {
  const assigneeId=useId();
  const [users,setUsers]=useState([]);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const employee=role==="EMPLOYEE";
  useEffect(()=>{
    if(employee)return;
    let active=true;
    api.get("/api/users?limit=100").then(result=>{
      if(!result.success||!Array.isArray(result.data))throw new Error("Could not load assignees.");
      if(active)setUsers(result.data.filter(user=>assignableTaskUser(user,role,tenantId)));
    }).catch(error=>{if(active)setError(error.message||"Could not load assignees.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[employee,role,tenantId]);
  if(employee)return <p className="cw-muted">Assigned to you</p>;
  return <label htmlFor={assigneeId}><span id={assigneeId+"-label"}>Assignee</span><select id={assigneeId} aria-labelledby={assigneeId+"-label"} value={draft.assignee||""} onChange={event=>setDraft(prev=>({...prev,assignee:event.target.value}))} disabled={loading}>
    <option value="">{["ORG_ADMIN","PLATFORM_SUPERADMIN"].includes(role)?"Choose an assignee":"Assign to me"}</option>
    {users.map(user=><option key={user.user_id} value={user.user_id}>{user.user_name}</option>)}
  </select>{error&&<span className="cw-field-error" role="alert">{error}</span>}</label>;
}

export function CallOutcomeFields({draft,setDraft,canTask,canEdit,role,tenantId}) {
  const set=(key,value)=>setDraft(prev=>({...prev,[key]:value}));
  return <>
    <label>Call outcome<select aria-label="Call outcome" value={draft.outcome} onChange={e=>setDraft(prev=>({...prev,outcome:e.target.value,markDnc:false}))}><option value="">Not recorded</option>{outcomes.map(outcome=><option key={outcome} value={outcome}>{humanize(outcome)}</option>)}</select></label>
    {draft.outcome==="DNC"&&canEdit&&<label className="cw-filter-mine"><input type="checkbox" checked={draft.markDnc} onChange={e=>set("markDnc",e.target.checked)}/> Mark contact as do not call</label>}
    {canTask&&<><label className="cw-filter-mine"><input type="checkbox" checked={draft.followup} onChange={e=>set("followup",e.target.checked)}/> Schedule a follow-up</label>
      {draft.followup&&<div className="cw-form-fields">
        <label>Follow-up subject<input required value={draft.followupSubject} maxLength={191} onChange={e=>set("followupSubject",e.target.value)}/></label>
        <div className="cw-date-row"><label>Follow-up date<input type="date" required value={draft.followupDate} onChange={e=>set("followupDate",e.target.value)}/></label><label>Follow-up time<input type="time" value={draft.followupTime} onChange={e=>set("followupTime",e.target.value)}/></label></div>
        <TaskAssigneeField draft={draft} setDraft={setDraft} role={role} tenantId={tenantId}/>
      </div>}
    </>}
  </>;
}

export function EntryFields({draft,onChange,kind}) {
  const set=(key,value)=>onChange({...draft,[key]:value});
  return <>
    <label>Subject<input required maxLength={191} value={draft.subject} onChange={e=>set("subject",e.target.value)}/></label>
    <label>{kind==="NOTE"?"Note":"Interaction notes"}<textarea aria-label={kind==="NOTE"?"Note":"Interaction notes"} required maxLength={10000} rows={5} value={draft.description} onChange={e=>set("description",e.target.value)}/></label>
    <label>Occurred at<input type="datetime-local" value={draft.occurred} onChange={e=>set("occurred",e.target.value)}/></label>
    <p className="cw-muted">{kind==="NOTE"?"Internal note; leave time empty to record now.":"Manual record only. CRM does not send messages or schedule meetings."}</p>
  </>;
}

export function EntryCorrectionDialog({record,remove,endpoint,onClose,onSaved}){
  const [draft,setDraft]=useState(()=>({subject:record.entry_subject,description:record.entry_description,occurred:localTaskDue(record.entry_occurred_at)}));
  const [pending,setPending]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState("");
  const lock=useRef(false),formId=useId();
  async function submit(event){
    event.preventDefault();
    if(lock.current||saved)return;
    if(!remove&&(!draft.subject.trim()||!draft.description.trim()||!draft.occurred)){setError("Enter subject, notes and occurrence time.");return;}
    lock.current=true;setPending(true);setError("");
    try{
      const url=endpoint+"/activities/"+encodeURIComponent(record.entry_id);
      const result=remove?await api.delete(url):await api.patch(url,{entry_subject:draft.subject,entry_description:draft.description,entry_occurred_at:draft.occurred===localTaskDue(record.entry_occurred_at)?record.entry_occurred_at:new Date(draft.occurred).toISOString(),entry_revision:record.entry_revision});
      if(!result.success||(!remove&&!result.data?.entry_id))throw new Error(result.message||"Could not change activity.");
      onSaved(remove?null:result.data);setSaved(true);
    }catch(error){setError(error.message||"Could not change activity.");}
    finally{lock.current=false;setPending(false);}
  }
  return <ActivityComposerDialog title={remove?"Delete activity":"Edit activity"} mode="entry" formId={formId} pending={pending} saved={saved} onClose={onClose} submitLabel={remove?"Delete activity":"Save changes"} destructive={remove}>
    <form id={formId} onSubmit={submit} className="cw-form cw-activity-form"><fieldset disabled={pending||saved} className="cw-form-fields">
      {remove?<p>Remove “{record.entry_subject}” from the timeline? Its previous content and correction history will be retained for audit.</p>:<EntryFields draft={draft} onChange={setDraft} kind={record.entry_kind}/>}
      {error&&<p role="alert" className="cw-error">{error}</p>}
    </fieldset></form>
  </ActivityComposerDialog>;
}
