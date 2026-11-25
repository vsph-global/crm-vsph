import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowUpRight } from "lucide-react";
import { api } from "../../utils/api";
import { ActivityComposerDialog } from "./ActivityComposerDialog";
import { formatDate, humanize } from "./contactWorkspaceUtils.js";

const stages=["PITCH_DONE","FOLLOW_UP","CONTRACT_OUT","CLOSED_WON","CLOSED_LOST"];
const relationshipStages=["NEW","CONTACTED","QUALIFIED","DISQUALIFIED","CUSTOMER"];
function displayValue(record){
  if(record.opportunity_value==null||!record.opportunity_currency)return "Value not set";
  return record.opportunity_currency+" "+String(record.opportunity_value);
}

export function Opportunities({opportunities=[],canCreate,canEdit,onEdit,onCreate}) {
  return <div className="cw-opportunity-content">
    <div className="cw-panel-header"><h2>Linked opportunities</h2>{canCreate&&<button type="button" className="cw-button cw-primary" onClick={onCreate}><Plus size={16} aria-hidden="true"/> Add opportunity</button>}</div>
    {opportunities.length?<ul className="cw-opportunities">{opportunities.map(record=><li key={record.opportunity_id}>
      <div className="cw-opportunity-info">
        <h3><Link className="cw-link" to={"/v2/opportunities?opportunity_id="+encodeURIComponent(record.opportunity_id)}>{record.opportunity_name||"Untitled opportunity"} <ArrowUpRight size={14} aria-hidden="true"/></Link></h3>
        <p className="cw-muted">{humanize(record.opportunity_stage,"No stage")} · {displayValue(record)}</p>
        <p className="cw-muted">Owner: {record.opportunity_owner?.user_name||"Not available"}</p>
        <p className="cw-muted">Expected close: {formatDate(record.opportunity_close_date,true)||"Not set"}</p>
        {record.opportunity_next_step&&<p className="cw-opportunity-next"><strong>Next step:</strong> {record.opportunity_next_step}</p>}
      </div>
      {canEdit&&<button type="button" className="cw-button" onClick={event=>onEdit(record,event.currentTarget)}>Edit</button>}
    </li>)}</ul>:<div className="cw-empty"><h3>No linked opportunities</h3><p>{canCreate?"Add an opportunity when there is a commercial prospect to develop.":"Opportunities associated with this contact will appear here."}</p></div>}
  </div>;
}

export function OpportunityEditor({record,endpoint,onClose,onSaved}) {
  const [draft,setDraft]=useState(()=>({
    opportunity_name:record?.opportunity_name||"",
    opportunity_close_date:record?.opportunity_close_date?.slice(0,10)||"",
    opportunity_stage:record?.opportunity_stage||"",
    opportunity_value:record?.opportunity_value??"",
    opportunity_currency:record?.opportunity_currency||"",
    opportunity_next_step:record?.opportunity_next_step||"",
  }));
  const [pending,setPending]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState("");
  const lock=useRef(false),formId=useId();
  function set(key,value){setDraft(prev=>({...prev,[key]:value}));}
  async function submit(event){
    event.preventDefault();
    if(lock.current||saved)return;
    if(!draft.opportunity_name.trim()||!draft.opportunity_close_date){setError("Enter a name and close date.");return;}
    if(draft.opportunity_value!==""&&(!/^\d{1,16}(\.\d{1,2})?$/.test(String(draft.opportunity_value))||!/^[A-Z]{3}$/.test(draft.opportunity_currency.toUpperCase()))){setError("Enter a nonnegative amount and a three-letter currency code.");return;}
    lock.current=true;setPending(true);setError("");
    try{
      const result=record?await api.patch(endpoint+"/opportunities/"+encodeURIComponent(record.opportunity_id),draft):await api.post(endpoint+"/opportunities",draft);
      if(!result.success||!result.data?.opportunity_id)throw new Error(result.message||"Could not save opportunity.");
      onSaved(result.data);setSaved(true);
    }catch(error){setError(error.message||"Could not save opportunity.");}
    finally{lock.current=false;setPending(false);}
  }
  return <ActivityComposerDialog title={record?"Edit opportunity":"Add opportunity"} mode="opportunity" formId={formId} pending={pending} saved={saved} onClose={onClose} submitLabel={record?"Save changes":"Create opportunity"}>
    <form id={formId} onSubmit={submit} className="cw-form cw-activity-form">
      <fieldset disabled={pending||saved} className="cw-form-fields">
        <label>Opportunity name *<input autoFocus required maxLength={191} value={draft.opportunity_name} onChange={e=>set("opportunity_name",e.target.value)}/></label>
        <label>Stage<select aria-label="Stage" value={draft.opportunity_stage} onChange={e=>set("opportunity_stage",e.target.value)}><option value="">Not set</option>{stages.map(stage=><option key={stage} value={stage}>{humanize(stage)}</option>)}</select></label>
        <label>Expected close date *<input type="date" required value={draft.opportunity_close_date} onChange={e=>set("opportunity_close_date",e.target.value)}/></label>
        <div className="cw-date-row"><label>Deal value<input inputMode="decimal" value={draft.opportunity_value} onChange={e=>set("opportunity_value",e.target.value)}/></label><label>Currency code<input placeholder="INR, USD…" maxLength={3} value={draft.opportunity_currency} onChange={e=>set("opportunity_currency",e.target.value.toUpperCase())}/></label></div>
        <label>Next step<input maxLength={191} value={draft.opportunity_next_step} onChange={e=>set("opportunity_next_step",e.target.value)}/></label>
        {error&&<p className="cw-error" role="alert">{error}</p>}
      </fieldset>
    </form>
  </ActivityComposerDialog>;
}

export function RelationshipEditor({value,endpoint,onSaved,onClose}) {
  const [stage,setStage]=useState(value||""),[pending,setPending]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState("");
  const lock=useRef(false),formId=useId();
  async function submit(event){
    event.preventDefault();
    if(lock.current||saved)return;
    lock.current=true;setPending(true);setError("");
    try{
      const result=await api.patch(endpoint+"/relationship",{contact_relationship_stage:stage||null});
      if(!result.success)throw new Error(result.message||"Could not update relationship.");
      onSaved(result.data.contact_relationship_stage);setSaved(true);
    }catch(error){setError(error.message||"Could not update relationship.");}
    finally{lock.current=false;setPending(false);}
  }
  return <ActivityComposerDialog title="Edit relationship" mode="relationship" formId={formId} pending={pending} saved={saved} onClose={onClose} submitLabel="Save relationship">
    <form id={formId} onSubmit={submit} className="cw-form cw-activity-form">
      <fieldset className="cw-form-fields" disabled={pending||saved}>
        <label>Relationship stage<select aria-label="Relationship stage" autoFocus value={stage} onChange={e=>setStage(e.target.value)}><option value="">Not set</option>{relationshipStages.map(stage=><option key={stage} value={stage}>{humanize(stage)}</option>)}</select></label>
        <p className="cw-muted">This describes the sales relationship, not whether the contact record is active.</p>
        {error&&<p className="cw-error" role="alert">{error}</p>}
      </fieldset>
    </form>
  </ActivityComposerDialog>;
}
