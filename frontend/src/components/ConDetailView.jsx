import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, MoreHorizontal, Phone, CheckCircle, FileText, Copy, Trash2, UserPlus, ChevronDown, Search, X, StickyNote, Mail, Calendar, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { useBlocker, useSearchParams } from "react-router-dom";
import { api } from "../utils/api";
import { readSessionValue } from "../utils/session.js";
import { canDoAction, hasModule, currentOrgRole } from "../utils/modules";
import AddContactModal from "./modals/AddContactModal";
import ContactProperties, { Expandable } from "./contact/ContactProperties";
import { SlidingTabs, CopyGlyph, Tooltip, ContactSkeleton } from "./contact/ContactMotion";
import { useCopyFeedback } from "./contact/useCopyFeedback.js";
import { ActivityFilters, AddActivityMenu } from "./contact/ActivityToolbar";
import { CallOutcomeFields, TaskAssigneeField, EntryFields, EntryCorrectionDialog } from "./contact/ContactActivityFields";
import { Opportunities, OpportunityEditor, RelationshipEditor } from "./contact/ContactCommercialWorkspace";
import { ActivityComposerDialog } from "./contact/ActivityComposerDialog";
import { ContactTaskEditor, TaskStatusControl } from "./contact/ContactTaskEditor";
import { useDialogExit } from "./contact/useDialogExit";
import { activityKey, requiredActivityFields, nextTaskCompletion, completionActor, allowedTaskStatuses, canManageTaskDetails, canRescheduleTask, menuFocusIndex } from "./contact/contactMotionUtils.js";
import { activityHistory, groupActivityByDate, activityTime, contactName, usableEmail, formatDate, humanize, taskDueDate, taskDeadline, splitActivity, contactActivitySummary } from "./contact/contactWorkspaceUtils.js";
import "./contact/contactWorkspace.css";

const errorMessage = (response, fallback) => response?.message || response?.error || fallback;
const blankTask = { subject:"", description:"", priority:"NORMAL", date:"", time:"12:00" };
const blankCall = { subject:"", description:"", outcome:"", markDnc:false, followup:false, followupSubject:"", followupDate:"", followupTime:"12:00", assignee:"" };
const blankEntry={subject:"",description:"",occurred:""};
const entryModes={note:"NOTE", "email-log":"EMAIL", meeting:"MEETING", linkedin:"LINKEDIN"};
const blankEmail = { subject:"", body:"", recipient:"", templateId:"" };

function MoreActions({ canEdit, canDelete, onCampaign, onDelete, code }) {
  const [open, setOpen] = useState(false);
  const {copied,copy:copyId}=useCopyFeedback(code);
  const [align,setAlign] = useState("right");
  const container = useRef(null), trigger = useRef(null), menu = useRef(null);
  const id = useId();
  function close(focus = false) { setOpen(false); if (focus) trigger.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    const handleOutside = (event) => { if (!container.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);
  function items() { return Array.from(menu.current?.querySelectorAll("button:not(:disabled)") || []); }
  function keyDown(event) {
    if (!open) return;
    if (event.key === "Escape") { event.preventDefault(); close(true); }
    if (event.key === "Tab") { close(true); return; }
    if (["ArrowDown","ArrowUp","Home","End"].includes(event.key)) {
      event.preventDefault();
      const buttons = items(), index = buttons.indexOf(document.activeElement);
      const next = menuFocusIndex(event.key, index, buttons.length);
      if (next !== null) buttons[next]?.focus();
    }
  }
  const openMenu = (last = false) => {
    const bounds = trigger.current?.getBoundingClientRect();
    setAlign(bounds && bounds.right < 224 ? "left" : "right");
    setOpen(true);
    requestAnimationFrame(() => { const buttons = items(); buttons[last ? buttons.length-1 : 0]?.focus(); });
  };
  return <div className="cw-menu-anchor" ref={container} onKeyDown={keyDown}>
    <Tooltip text={copied ? "Contact ID copied" : "More contact actions"}><button type="button" className="cw-button cw-icon" ref={trigger} aria-label="More contact actions" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => open ? close(true) : openMenu()} onKeyDown={e => { if (["ArrowDown","ArrowUp"].includes(e.key) && !open) { e.stopPropagation(); e.preventDefault(); openMenu(e.key === "ArrowUp"); } }}><span className="cw-more-feedback" data-copied={copied}><MoreHorizontal size={20} className="cw-more-glyph" aria-hidden="true"/><CopyGlyph copied={copied}/></span></button></Tooltip>
    <div id={id} role="menu" aria-label="Contact actions" className="cw-menu" data-open={open} data-align={align} inert={!open} ref={menu}>
      {canEdit && <button type="button" role="menuitem" onClick={() => { close(true); onCampaign(trigger.current); }}><UserPlus size={16}/> Add to campaign</button>}
      {code && <button type="button" role="menuitem" onClick={async () => { close(true); if (await copyId()) toast.success("Contact ID copied",{id:"cw-copy-id",duration:1800}); else toast.error("Could not copy contact ID",{id:"cw-copy-id"}); }}><Copy size={16}/> Copy contact ID</button>}
      {canDelete && <button type="button" role="menuitem" className="cw-danger-text" onClick={() => { close(true); onDelete(trigger.current); }}><Trash2 size={16}/> Delete contact</button>}
    </div>
  </div>;
}

function DeleteDialog({ name, onConfirm, onClose, pending, error }) {
  const ref = useRef(null), title = useId();
  const {closing,close}=useDialogExit(onClose);
  // Close before React removes the native dialog, releasing its modal focus scope.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className="cw-dialog" data-closing={closing} aria-labelledby={title} aria-busy={pending||closing} onCancel={e => { e.preventDefault(); if (!pending) close(); }}>
    <div className="cw-dialog-body" inert={closing}>
      <h2 id={title}>Delete contact?</h2>
      <p>This will delete {name}. Confirm only if you no longer need this contact.</p>
      {error && <p role="alert" className="cw-error">{error}</p>}
      <div className="cw-actions cw-dialog-actions"><button type="button" autoFocus className="cw-button" onClick={close} disabled={pending||closing}>Cancel</button><button type="button" className="cw-button cw-danger" onClick={onConfirm} disabled={pending||closing}>{pending ? "Deleting…" : "Delete contact"}</button></div>
    </div>
  </dialog>;
}

function EventField({ label, children, className="" }) {
  return <div className={"cw-event-field "+className}><dt>{label}</dt><dd>{children}</dd></div>;
}

function TaskCompletionMeta({ record }) {
  const [audit,setAudit]=useState(null);
  const complete=record.task_status==="COMPLETED";
  const hasAudit=Array.isArray(record.task_updates);
  const key=record.task_id+":"+String(record.task_completed_at||"");
  useEffect(()=>{
    if(!complete || hasAudit || !record.task_id)return;
    let active=true;
    api.get("/api/tasks/"+encodeURIComponent(record.task_id)).then(result=>{
      if(active && result?.success && result.data?.task_status==="COMPLETED" &&
        result.data.task_completed_at===record.task_completed_at) setAudit({key,actor:completionActor(result.data)});
    }).catch(()=>{ /* Never invent completion attribution. */ });
    return ()=>{active=false;};
  },[complete,hasAudit,key,record.task_id,record.task_completed_at]);
  if(!complete)return null;
  const actor=completionActor(record) || (audit?.key===key ? audit.actor : null);
  const date=formatDate(record.task_completed_at);
  return <>
    <EventField label="Completed by" className="cw-completion-meta">{actor || "Not available"}</EventField>
    <EventField label="Completed at" className="cw-completion-meta">{date || "Date unavailable"}</EventField>
  </>;
}

function ActivityNode({ item, newActivity, taskAccess, taskWrites, taskErrors, onTaskToggle, onTaskStatus, onTaskEdit, expanded, onExpand, alphabetical, now, upcoming=false, canEditEntry, canDeleteEntry, onEntryCorrection }) {
  const {kind,record,date}=item;
  const call=kind==="call", task=kind==="task";
  const Icon=({call:Phone,task:CheckCircle,note:StickyNote,email:Mail,meeting:Calendar,linkedin:MessageSquare})[kind] || FileText;
  const subject=(call?record.call_subject:task?record.task_subject:record.entry_subject) || (call?"Call":task?"Untitled task":"Activity");
  const description=call?record.call_description:task?record.task_description:record.entry_description;
  const key=activityKey(kind,record), detailsId=useId();
  const done=task && record.task_status==="COMPLETED";
  const deadline=!task||done?null:taskDeadline(record,now);
  const next=!task ? null : nextTaskCompletion(record,taskAccess);
  const updating=task && !!taskWrites[record.task_id];
  const taskError=task && taskErrors[record.task_id];
  // Mount secondary details on first expansion and retain them for the exit
  // animation. Historical audit requests are deferred until first disclosure.
  const [visited,setVisited]=useState(expanded);
  function toggle(){if(!expanded)setVisited(true);onExpand(key);}
  return <li className="cw-timeline-item" data-new={newActivity===key} data-completed={done}>
    <span className="cw-event-icon"><Icon size={18} strokeWidth={2} aria-hidden="true"/><span className="cw-sr">{kind==="linkedin"?"LinkedIn":humanize(kind)}</span></span>
    <div className="cw-event-content">
      <div className="cw-event-top">
        <button type="button" className="cw-event-disclosure" aria-label={`${expanded?"Collapse":"Expand"} details: ${subject}`} aria-expanded={expanded} aria-controls={detailsId} onClick={toggle}><ChevronDown className="cw-chevron" size={18} aria-hidden="true"/></button>
        <div className="cw-event-summary">
          <h3>{subject}</h3>
          <div className="cw-event-summary-meta">
            {task && <TaskStatusControl record={record} access={taskAccess} busy={updating} onStatus={onTaskStatus}/>}
            {!call&&!task&&<span className="cw-muted">{kind==="linkedin"?"LinkedIn":humanize(kind)}</span>}
            {call&&record.call_outcome&&<span className="cw-muted">{humanize(record.call_outcome)}</span>}
            {deadline&&<span className="cw-event-time cw-deadline" data-deadline={deadline}>{deadline==="unscheduled"?"No due date":`${deadline==="overdue"?"Overdue · ":deadline==="today"?"Today · ":"Due "}${formatDate(record.task_due_date)}`}</span>}
            {!upcoming&&<span className="cw-event-time">{alphabetical ? formatDate(date)||"Date unavailable" : activityTime(date)}</span>}
          </div>
        </div>
        <div className="cw-event-actions">
          {task && <button type="button" role="checkbox" className="cw-task-check" aria-checked={done} aria-disabled={!next||updating} aria-busy={updating} aria-label={`Complete task: ${subject || "Untitled task"}`} title={updating ? "Saving status…" : !next ? "Status cannot be changed here" : done ? "Reopen task" : "Mark complete"} onClick={()=>{if(next&&!updating)onTaskToggle(record);}}><span className="cw-task-check-box" aria-hidden="true"><span className="cw-task-spinner"/><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path pathLength="1" d="m5 12 4 4L19 6"/></svg></span></button>}
        </div>
      </div>
      <Expandable id={detailsId} open={expanded} className="cw-event-expand">
        {(visited||expanded) && <div className="cw-event-details">
          {description ? <p className="cw-event-notes">{description}</p> : <p className="cw-event-no-notes">No notes recorded.</p>}
          <dl className="cw-event-fields">
            <EventField label={task?"Assigned to":"Recorded by"}>{record.user?.user_name || "Unknown user"}</EventField>
            <EventField label={call||task?"Created":"Occurred"}>{formatDate(task?record.task_created_at:date) || "Date unavailable"}</EventField>
            {task && <>
              <EventField label="Priority">{humanize(record.task_priority,"Normal")}</EventField>
              <EventField label="Due date">{formatDate(record.task_due_date) || "Not set"}</EventField>
              <TaskCompletionMeta record={record}/>
            </>}
          </dl>
          {task&&(canManageTaskDetails(record,taskAccess)||canRescheduleTask(record,taskAccess))&&<div className="cw-form-footer"><button type="button" className="cw-button" disabled={updating} onClick={e=>onTaskEdit(record,e.currentTarget)}>{canManageTaskDetails(record,taskAccess)?"Edit task":"Reschedule task"}</button></div>}
          {!call&&!task&&(canEditEntry||canDeleteEntry)&&<div className="cw-form-footer">{record.entry_revision>0&&<span className="cw-muted">Edited</span>}{canEditEntry&&<button type="button" className="cw-button" onClick={e=>onEntryCorrection(record,false,e.currentTarget)}>Edit activity</button>}{canDeleteEntry&&<button type="button" className="cw-button" onClick={e=>onEntryCorrection(record,true,e.currentTarget)}>Delete activity</button>}</div>}
        </div>}
      </Expandable>
      {taskError && <p className="cw-field-error" role="alert">{taskError}</p>}
    </div>
  </li>;
}

function useActivityView() {
  const [sort,setSort]=useState("newest"), [status,setStatus]=useState("all"), [priority,setPriority]=useState("all");
  const [deadline,setDeadline]=useState("all"), [mine,setMine]=useState(false);
  const [query,setQuery]=useState(""), [searchOpen,setSearchOpen]=useState(false), [filterOpen,setFilterOpen]=useState(false);
  const [expandedKeys,setExpandedKeys]=useState(()=>new Set());
  const searchId=useId(), searchRef=useRef(null), searchButton=useRef(null);
  function resetFilters(){setSort("newest");setStatus("all");setPriority("all");setDeadline("all");setMine(false);}
  function closeSearch(){setSearchOpen(false);setQuery("");searchButton.current?.focus();}
  function toggle(key){setExpandedKeys(prev=>{const next=new Set(prev);if(next.has(key))next.delete(key);else next.add(key);return next;});}
  return {sort,setSort,status,setStatus,priority,setPriority,deadline,setDeadline,mine,setMine,query,setQuery,searchOpen,setSearchOpen,filterOpen,setFilterOpen,searchId,searchRef,searchButton,expandedKeys,toggle,resetFilters,closeSearch};
}

function WorkspaceSwitch({view,onChange,contentId,canViewOpportunities}) {
  function handleKeys(event){
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
    const buttons=Array.from(event.currentTarget.querySelectorAll("button"));
    const index=buttons.indexOf(document.activeElement);
    if(index<0)return;
    event.preventDefault();
    const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:(index+(event.key==="ArrowRight"?1:-1)+buttons.length)%buttons.length;
    buttons[next]?.focus();
    buttons[next]?.click();
  }
  if(!canViewOpportunities)return <h2>Activity history</h2>;
  return <div className="cw-workspace-switch" role="group" aria-label="Contact workspace views" data-view={view} onKeyDown={handleKeys}>
    <span className="cw-workspace-switch-indicator" aria-hidden="true"/>
    {[["activity","Activity history"],["opportunities","Opportunities"]].map(([value,label])=><button type="button" key={value} aria-pressed={view===value} aria-controls={contentId} onClick={()=>onChange(value)}>{label}</button>)}
  </div>;
}

function ActivityControls({view,filter,canViewTasks,actions,onAddActivity}) {
  const {sort,setSort,status,setStatus,priority,setPriority,deadline,setDeadline,mine,setMine,searchOpen,setSearchOpen,filterOpen,setFilterOpen,searchId,searchRef,searchButton,closeSearch,resetFilters}=view;
  const taskFilters=(filter==="all"||filter==="task") && canViewTasks;
  const count=Number(sort!=="newest")+Number(taskFilters&&status!=="all")+Number(taskFilters&&priority!=="all")+Number(taskFilters&&deadline!=="all")+Number(taskFilters&&mine);
  return <div className="cw-history-controls">
        <button ref={searchButton} type="button" className="cw-icon cw-history-search-button" aria-label="Search activities" aria-expanded={searchOpen} aria-controls={searchId} onClick={()=>{if(searchOpen)closeSearch();else{setSearchOpen(true);setFilterOpen(false);requestAnimationFrame(()=>searchRef.current?.focus());}}}><Search size={18} aria-hidden="true"/></button>
        <ActivityFilters open={filterOpen} onOpen={setFilterOpen} sort={sort} setSort={setSort} status={status} setStatus={setStatus} priority={priority} setPriority={setPriority} deadline={deadline} setDeadline={setDeadline} mine={mine} setMine={setMine} taskFilters={taskFilters} count={count} onReset={resetFilters}/>
        <AddActivityMenu actions={actions} onSelect={onAddActivity} onOpen={()=>setFilterOpen(false)}/>
      </div>;
}

function Timeline({ calls, tasks, entries, loading, error, filter, setFilter, canViewTasks, onRetry, newActivity, taskAccess, taskWrites, taskErrors, onTaskToggle, onTaskStatus, onTaskEdit, feedback, lastCreated, view, now, userId, canEditEntry, canDeleteEntry, onEntryCorrection }) {
  const {sort,status,priority,deadline,mine,query,setQuery,searchOpen,searchId,searchRef,closeSearch,expandedKeys,toggle,resetFilters}=view;
  const taskFilters=(filter==="all"||filter==="task") && canViewTasks;
  const activeStatus=taskFilters?status:"all", activePriority=taskFilters?priority:"all";
  const activeDeadline=taskFilters?deadline:"all", activeMine=taskFilters&&mine;
  const items = useMemo(
    () => activityHistory(calls, tasks, filter, { query, status: activeStatus, priority: activePriority, sort, deadline: activeDeadline, mine: activeMine, userId, now, entries }),
    [calls, tasks, filter, query, activeStatus, activePriority, sort, activeDeadline, activeMine, userId, now, entries]
  );
  const alphabetical = sort === "az" || sort === "za";
  const {open,past}=useMemo(()=>splitActivity(items),[items]);
  const groups = useMemo(
    () => alphabetical ? [{ key: "alphabetical", label: null, items }] : groupActivityByDate(past),
    [alphabetical, items, past]
  );
  const hasFilters = Boolean(query.trim()) || activeStatus !== "all" || activePriority !== "all" || activeDeadline !== "all" || activeMine;
  function renderNode(item, upcoming) {
    const key=activityKey(item.kind,item.record);
    return <ActivityNode key={key} item={item} newActivity={newActivity} taskAccess={taskAccess} taskWrites={taskWrites} taskErrors={taskErrors} onTaskToggle={onTaskToggle} onTaskStatus={onTaskStatus} onTaskEdit={onTaskEdit} expanded={expandedKeys.has(key)} onExpand={toggle} alphabetical={alphabetical} now={now} upcoming={upcoming} canEditEntry={canEditEntry} canDeleteEntry={canDeleteEntry} onEntryCorrection={onEntryCorrection}/>;
  }
  return <>
    <h2 className="cw-sr">Activity history</h2>
    <Expandable id={searchId} open={searchOpen}><div className="cw-history-search"><Search size={18} aria-hidden="true"/><input ref={searchRef} type="search" aria-label="Search activities and notes" placeholder="Search activities…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")closeSearch();}}/><button type="button" className="cw-icon" aria-label="Close search" onClick={closeSearch}><X size={18} aria-hidden="true"/></button></div></Expandable>
    <SlidingTabs className="cw-history-tabs" label="Filter activity" options={[["all","All activity"],["call","Calls"],...(canViewTasks ? [["task","Tasks"]] : []),["note","Notes"],["communication","Communications"]]} value={filter} onChange={setFilter}/>
    {feedback&&<p className="cw-feedback cw-history-feedback" role="status"><CheckCircle size={16} aria-hidden="true"/>{feedback}{lastCreated&&!items.some(item=>activityKey(item.kind,item.record)===lastCreated)&&" It is hidden by your current view or permissions."}</p>}
    {error && <div className="cw-error cw-history-error" role="alert">{error} <button type="button" className="cw-link" onClick={onRetry}>Retry</button></div>}
    {loading ? <ContactSkeleton history/> : items.length===0 ? <div className="cw-empty cw-history-empty"><FileText size={32} strokeWidth={1.75} aria-hidden="true"/><h3>{error ? "Activity unavailable" : hasFilters ? "No matching activities" : filter==="all" ? "Activity history appears here" : filter==="call" ? "No calls yet" : filter==="task" ? "No tasks yet" : "No matching activities"}</h3><p>{error ? "Retry to load the history." : hasFilters ? "Try changing your filters or search query." : filter==="all" ? "Recorded communications and completed work appear here." : "Recorded interactions will appear here."}</p>{!error&&hasFilters&&<button type="button" className="cw-button" onClick={()=>{resetFilters();setQuery("");}}>Clear filters</button>}</div> :
      <div className="cw-timeline">{!alphabetical&&open.length>0&&<section className="cw-timeline-group cw-upcoming"><h3 className="cw-section-heading">Upcoming activities <span className="cw-muted">{open.length} open</span></h3><ol className="cw-timeline-list">{open.map(item=>renderNode(item,true))}</ol></section>}{!alphabetical&&past.length>0&&open.length>0&&<h3 className="cw-section-heading">Past activity</h3>}{groups.map(group=><section className="cw-timeline-group" key={group.key}>
        {group.label&&<h3 className="cw-timeline-date">{group.label}</h3>}
        <ol className="cw-timeline-list">{group.items.map(item=>renderNode(item,false))}</ol>
      </section>)}</div>}
  </>;
}

export default function ConDetailView({ isOpen, onClose, contactId, onChanged, neighbors, onNavigate }) {
  // The parent keys this component by contact ID, so drafts and requests are isolated per record.
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return ()=>clearInterval(timer);},[]);
  const [contact, setContact] = useState(null), [loading, setLoading] = useState(true), [loadError,setLoadError] = useState("");
  const [taskWrites,setTaskWrites]=useState({}), [taskErrors,setTaskErrors]=useState({});
  const taskLocks=useRef(new Set());
  const [entries,setEntries]=useState([]);
  const [entryDrafts,setEntryDrafts]=useState({});
  const [calls,setCalls] = useState([]), [tasks,setTasks] = useState([]), [historyLoading,setHistoryLoading] = useState(true), [historyError,setHistoryError] = useState("");
  const [revision,setRevision] = useState(0), [historyRevision,setHistoryRevision] = useState(0);
  const [searchParams,setSearchParams]=useSearchParams();
  const canViewOpportunities=hasModule("OPPORTUNITIES")&&canDoAction("OPPORTUNITIES","VIEW");
  const canCreateOpportunity=canViewOpportunities&&canDoAction("OPPORTUNITIES","CREATE")&&currentOrgRole()!=="PLATFORM_SUPERADMIN";
  const canEditOpportunity=canViewOpportunities&&canDoAction("OPPORTUNITIES","EDIT");
  const tab=canViewOpportunities&&searchParams.get("contact_view")==="opportunities"?"opportunities":"activity";
  const activityView=useActivityView(), workspaceContentId=useId();
  const [filter,setFilter] = useState("all"), [mode,setMode] = useState(null);
  function switchWorkspace(value){
    if(value===tab)return;
    activityView.setFilterOpen(false);setNewActivity(null);
    setSearchParams(previous=>{const next=new URLSearchParams(previous);if(value==="opportunities")next.set("contact_view","opportunities");else next.delete("contact_view");return next;},{replace:true,preventScrollReset:true});
  }
  const [call,setCall] = useState(blankCall), [task,setTask] = useState(blankTask), [email,setEmail] = useState(blankEmail);
  const [emailTemplates,setEmailTemplates]=useState([]), [templateError,setTemplateError]=useState("");
  const [fieldErrors,setFieldErrors]=useState({});
  const [savedMode,setSavedMode] = useState(null), [newActivity,setNewActivity] = useState(null), [lastCreated,setLastCreated]=useState(null);
  const savedActivity=useRef(null);
  const [pending,setPending] = useState(null), [saveError,setSaveError] = useState(""), [feedback,setFeedback] = useState("");
  const [edit,setEdit] = useState(false), [focusCampaign,setFocusCampaign] = useState(false), [deleting,setDeleting] = useState(false), [deletePending,setDeletePending] = useState(false), [deleteError,setDeleteError] = useState("");
  const [taskEditing,setTaskEditing]=useState(null);
  const [entryCorrection,setEntryCorrection]=useState(null);
  const [deletedContact,setDeletedContact]=useState(false);
  const [opportunityEditing,setOpportunityEditing]=useState(null),[relationshipEditing,setRelationshipEditing]=useState(false);
  const editSaved=useRef(false), dialogOpener=useRef(null);
  const composerId = useId(), composer = useRef(null), saveLock = useRef(false), deleteLock = useRef(false);
  const canEdit = canDoAction("CONTACTS","EDIT"), canDelete = canDoAction("CONTACTS","DELETE"), canCall = canDoAction("CONTACTS","CREATE");
  useEffect(()=>{
    if(mode!=="email")return;
    let active=true;
    api.get("/api/email-templates").then(result=>{if(!result.success||!Array.isArray(result.data))throw new Error("Could not load templates.");if(active){setEmailTemplates(result.data);setTemplateError("");}}).catch(error=>{if(active)setTemplateError(error.message||"Could not load templates.");});
    return ()=>{active=false;};
  },[mode]);
  const canAssignCampaign = canEdit && hasModule("CAMPAIGNS") && canDoAction("CAMPAIGNS","VIEW");
  const canViewTasks = hasModule("TASKS") && canDoAction("TASKS","VIEW");
  const canTask = hasModule("TASKS") && canDoAction("TASKS","CREATE");
  const endpoint = `/api/contacts/${encodeURIComponent(contactId)}`;
  const currentUserId = readSessionValue("vsph_user_id") || undefined;
  const currentUserName = readSessionValue("vsph_user_name") || "Unknown user";
  const taskAccess={canEdit:canViewTasks && canDoAction("TASKS","EDIT"),role:currentOrgRole(),userId:currentUserId};
  // The opener is captured from the actual action, not document.activeElement
  // (which can already be inside an autofocused dialog). Restore after the
  // closing dialog has been removed and its modal focus scope released.
  useLayoutEffect(() => {
    if (edit || deleting || taskEditing || mode || opportunityEditing || relationshipEditing || entryCorrection) return;
    const opener=dialogOpener.current;
    dialogOpener.current=null;
    if (opener?.isConnected && !opener.disabled && !opener.closest("[inert]")) opener.focus({preventScroll:true});
    else if(opener) (document.querySelector(".cw-filter-button")||document.querySelector(".cw-workspace-switch button[aria-pressed=true]"))?.focus({preventScroll:true});
  }, [edit,deleting,taskEditing,mode,opportunityEditing,relationshipEditing,entryCorrection]);
  useEffect(() => {
    if (!isOpen || !contactId) return;
    let cancelled = false;
    api.get(endpoint).then(result => {
      if (!result.success || !result.data) throw new Error(errorMessage(result,"Contact not found."));
      if (!cancelled) { setContact(result.data); setLoadError(""); }
    }).catch(error => { if (!cancelled) setLoadError(error.message || "Could not load contact."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [endpoint,isOpen,contactId,revision]);
  useEffect(() => {
    if (!isOpen || !contactId) return;
    let cancelled = false;
    const id = encodeURIComponent(contactId);
    const fetchCalls = async () => {
      const result = await api.get(`/api/calls?contact_id=${id}`);
      if (!Array.isArray(result)) throw new Error(errorMessage(result,"Could not load calls."));
      if (!cancelled) setCalls(result);
    };
    const fetchTasks = async () => {
      if (!canViewTasks) return;
      const records = []; let page = 1, pages;
      do {
        const result = await api.get(`/api/tasks?contact_id=${id}&limit=100&page=${page}`);
        if (!result.success || !Array.isArray(result.data)) throw new Error(errorMessage(result,"Could not load tasks."));
        records.push(...result.data);
        pages = result.pagination?.totalPages || 1;
        page++;
      } while (!cancelled && page <= pages);
      if (!cancelled) setTasks(records);
    };
    const fetchEntries=async()=>{
      const records=[];
      let page=1,pages;
      do {
        const result=await api.get(`${endpoint}/activities?limit=100&page=${page}`);
        if(!result.success||!Array.isArray(result.data))throw new Error(errorMessage(result,"Could not load communication history."));
        records.push(...result.data);pages=result.pagination?.totalPages||1;page++;
      }while(!cancelled&&page<=pages);
      if(!cancelled)setEntries(records);
    };
    Promise.allSettled([fetchCalls(),fetchTasks(),fetchEntries()]).then(results => {
      if (!cancelled) {
        setHistoryError(results.filter(r => r.status==="rejected").map(r=>r.reason?.message || "Could not load activity.").join(" "));
        setHistoryLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [contactId,endpoint,isOpen,canViewTasks,historyRevision]);
  useEffect(()=>{if(!newActivity)return;const timer=setTimeout(()=>setNewActivity(null),1250);return ()=>clearTimeout(timer);},[newActivity]);
  function openComposer(next,opener) {
    if (saveLock.current || pending || mode || (next==="call" && !canCall) || (next==="task" && !canTask)) return;
    dialogOpener.current=opener;
    savedActivity.current=null;
    setMode(next);setSavedMode(null);setFieldErrors({});setSaveError("");setFeedback("");setLastCreated(null);setNewActivity(null);
    requestAnimationFrame(()=>composer.current?.querySelector("input:not([disabled]),textarea:not([disabled]),select:not([disabled])")?.focus({preventScroll:true}));
  }
  function finishComposer() {
    if(savedActivity.current){
      setNewActivity(savedActivity.current);setLastCreated(savedActivity.current);savedActivity.current=null;
    }
    if(mode==="email")setFeedback("");
    setMode(null);setFieldErrors({});setSavedMode(null);setSaveError("");
  }
  const dirty=Boolean(call.subject||call.description||call.outcome||call.markDnc||call.followup||call.followupSubject||call.followupDate||call.followupTime!=="12:00"||call.assignee||task.subject||task.description||task.date||task.assignee||task.priority!=="NORMAL"||task.time!=="12:00"||email.subject||email.body||email.recipient||email.templateId||Object.values(entryDrafts).some(draft=>draft.subject||draft.description||draft.occurred));
  const dialogOpen=Boolean(mode||taskEditing||opportunityEditing||relationshipEditing||edit||deleting||entryCorrection);
  const saving=Boolean(pending||deletePending||Object.values(taskWrites).some(Boolean));
  const blocker=useBlocker(({currentLocation,nextLocation})=>{
    const sameRecord=currentLocation.pathname===nextLocation.pathname&&new URLSearchParams(currentLocation.search).get("contact_id")===new URLSearchParams(nextLocation.search).get("contact_id");
    return !deletedContact&&!sameRecord&&(dirty||dialogOpen||saving);
  });
  useEffect(()=>{
    if(blocker.state!=="blocked")return;
    if(saving||dialogOpen){blocker.reset();return;}
    if(window.confirm("Discard unsaved activity drafts?"))blocker.proceed();else blocker.reset();
  },[blocker,saving,dialogOpen]);
  useEffect(()=>{
    if(!dirty&&!dialogOpen&&!saving)return;
    const warn=event=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);
    return()=>window.removeEventListener("beforeunload",warn);
  },[dirty,dialogOpen,saving]);
  function closeWorkspace(){if(!saving&&!dialogOpen)onClose();}
  function navigateContact(id){if(id&&!saving&&!dialogOpen)onNavigate?.(id);}
  function retryHistory() { if(taskLocks.current.size)return; setHistoryLoading(true); setHistoryError(""); setHistoryRevision(v=>v+1); }
  async function saveTaskPatch(record,patch) {
    const id=record.task_id;
    if(historyLoading||taskLocks.current.has(id))throw new Error("A task update is already in progress.");
    if(patch.task_status!==undefined&&!allowedTaskStatuses(record,taskAccess).includes(patch.task_status))throw new Error("This status change is not permitted.");
    if(Object.keys(patch).some(key=>key!=="task_status"&&!(key==="task_due_date"&&canRescheduleTask(record,taskAccess)))&&!canManageTaskDetails(record,taskAccess))throw new Error("Task editing is not permitted.");
    taskLocks.current.add(id);
    setTaskWrites(prev=>({...prev,[id]:true}));setTaskErrors(prev=>({...prev,[id]:null}));
    try{
      const result=await api.patch("/api/tasks/"+encodeURIComponent(id),patch);
      const updated=result?.data;
      if(!result?.success||updated?.task_id!==id||(patch.task_status!==undefined&&updated.task_status!==patch.task_status))throw new Error(errorMessage(result,"Could not update task."));
      setTasks(prev=>prev.map(item=>item.task_id===id?{...item,...updated}:item));
      return updated;
    }finally{
      taskLocks.current.delete(id);setTaskWrites(prev=>({...prev,[id]:false}));
    }
  }
  async function changeTaskStatus(record,next){
    if(!next||next===record.task_status||taskLocks.current.has(record.task_id))return;
    try{await saveTaskPatch(record,{task_status:next});}
    catch(error){setTaskErrors(prev=>({...prev,[record.task_id]:error.message||"Could not update task status. Try again."}));}
  }
  function toggleTask(record){return changeTaskStatus(record,nextTaskCompletion(record,taskAccess));}
  function editTask(record,opener){
    if((!canManageTaskDetails(record,taskAccess)&&!canRescheduleTask(record,taskAccess))||taskLocks.current.has(record.task_id))return;
    dialogOpener.current=opener;setTaskEditing(record);
  }
  async function submit(event) {
    event.preventDefault();
    if (saveLock.current || pending || savedMode || !mode || (mode !== "email" && historyLoading)) return;
    setSavedMode(null); setSaveError(""); setFeedback("");
    if (mode === "email") {
      if(!canCall)return;
      const available = [contact.contact_professional_email,contact.contact_personal_email].filter(usableEmail);
      const recipient=available.includes(email.recipient)?email.recipient:available[0];
      if(!recipient){setSaveError("This contact does not have a usable email address.");return;}
      if(!email.templateId&&(!email.subject.trim()||!email.body.trim())){setSaveError("Enter a subject and message.");return;}
      if(email.templateId&&!emailTemplates.some(t=>t.email_template_id===email.templateId)){setSaveError("Choose an available email template.");return;}
      saveLock.current=true;setPending(mode);
      try{
        const vars=emailVariables(recipient);
        const result=await api.post("/api/emails/send",email.templateId?{to:recipient,template_id:email.templateId,template_vars:vars}:{to:recipient,subject:email.subject.trim(),body:email.body});
        if(!result.success)throw new Error(errorMessage(result,"Could not send email."));
        setEmail(blankEmail);setSavedMode(mode);toast.success("Email sent.");
      }catch(error){setSaveError(error.message||"Could not send email.");}finally{saveLock.current=false;setPending(null);}
      return;
    }
    if (entryModes[mode]) {
      if(!canCall)return;
      const draft=entryDrafts[mode]||blankEntry;
      if(!draft.subject.trim()||!draft.description.trim()){setSaveError("Enter a subject and notes.");return;}
      saveLock.current=true;setPending(mode);
      try {
        const result=await api.post(`${endpoint}/activities`,{entry_kind:entryModes[mode],entry_subject:draft.subject,entry_description:draft.description,entry_occurred_at:draft.occurred?new Date(draft.occurred).toISOString():undefined});
        if(!result.success||!result.data?.entry_id)throw new Error(errorMessage(result,"Could not save activity."));
        setEntries(prev=>[result.data,...prev]);setEntryDrafts(prev=>({...prev,[mode]:blankEntry}));
        savedActivity.current=activityKey(result.data.entry_kind.toLowerCase(),result.data);setSavedMode(mode);setFeedback("Activity saved.");
      }catch(error){setSaveError(error.message||"Could not save activity.");}finally{saveLock.current=false;setPending(null);}
      return;
    }
    const isCall = mode === "call";
    if (isCall ? !canCall : !canTask) return;
    const errors=requiredActivityFields(mode,isCall?call:task);
    setFieldErrors(errors);
    if(Object.keys(errors).length){composer.current?.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus();return;}
    if (isCall&&call.followup&&canTask&&(!call.followupSubject.trim()||!call.followupDate||!(call.assignee||currentUserId))){setSaveError("Enter a follow-up subject, due date and assignee.");return;}
    if ((!isCall||call.followup)&&["ORG_ADMIN","PLATFORM_SUPERADMIN"].includes(taskAccess.role)&&!(isCall?call.assignee:task.assignee)){setSaveError("Choose an assignee.");return;}
    saveLock.current = true; setPending(mode);
    try {
      const payload = isCall ? {call_user_fk:currentUserId,call_contact_fk:contactId,call_subject:call.subject.trim(),call_description:call.description.trim(),call_outcome:call.outcome||null,...(canEdit&&call.outcome==="DNC"&&call.markDnc?{mark_do_not_call:true}:{}),...(call.followup&&canTask?{followup:{subject:call.followupSubject,due:taskDueDate(call.followupDate,call.followupTime),assignee:call.assignee||currentUserId}}:{})} :
        {task_user_fk:task.assignee||currentUserId,task_contact_fk:contactId,task_subject:task.subject.trim(),task_description:task.description,task_priority:task.priority,task_due_date:taskDueDate(task.date,task.time)};
      const result = await api.post(isCall ? "/api/calls" : "/api/tasks", {...payload,...(taskAccess.role==="PLATFORM_SUPERADMIN"?{tenant_fk:contact.tenant_fk}:{})});
      const record = result?.data || result;
      if (!record || result.success === false || result.error || !(isCall ? record.call_id : record.task_id)) throw new Error(errorMessage(result,"Could not save activity."));
      const {followup_task:followupTask,...savedRecord}=record;
      const saved = {...savedRecord,user:record.user || ((isCall||!task.assignee||task.assignee===currentUserId)?{user_name:currentUserName}:undefined)};
      if (isCall) { setCalls(prev=>[saved,...prev.filter(x=>x.call_id!==saved.call_id)]); setCall(blankCall); if(followupTask&&canViewTasks)setTasks(prev=>[followupTask,...prev.filter(x=>x.task_id!==followupTask.task_id)]); }
      else { if (canViewTasks) setTasks(prev=>[saved,...prev.filter(x=>x.task_id!==saved.task_id)]); setTask(blankTask); }
      savedActivity.current=activityKey(isCall ? "call" : "task",saved);
      setSavedMode(mode);setFeedback(isCall ? (followupTask?"Call and follow-up saved.":"Call saved.") : "Task created.");setRevision(v=>v+1);
    } catch(error) { setSaveError(error.message || "Could not save activity. Try again."); }
    finally { saveLock.current=false; setPending(null); }
  }
  async function confirmDelete() {
    if (!canDelete || deleteLock.current) return;
    deleteLock.current=true; setDeletePending(true); setDeleteError("");
    try {
      const result=await api.delete(endpoint);
      if (!result.success) throw new Error(errorMessage(result,"Could not delete contact."));
      toast.success("Contact deleted",{id:"cw-contact-deleted",duration:2500}); setDeletedContact(true); onChanged?.();
    } catch(error) { setDeleteError(error.message || "Could not delete contact."); }
    finally { deleteLock.current=false; setDeletePending(false); }
  }
  useEffect(()=>{if(deletedContact)onClose();},[deletedContact,onClose]);
  const summary=useMemo(()=>contactActivitySummary(calls,tasks,now,entries),[calls,tasks,now,entries]);
  if (!isOpen) return null;
  const name=contactName(contact), initials=[contact?.contact_firstname,contact?.contact_lastname].filter(Boolean).map(v=>v[0].toUpperCase()).join("") || "C";
  const recipients=[...new Set([contact?.contact_professional_email,contact?.contact_personal_email].filter(usableEmail))];
  function emailVariables(recipient){return {contact_firstname:contact?.contact_firstname||"",contact_lastname:contact?.contact_lastname||"",contact_name:contactName(contact),contact_email:recipient||"",employee_name:currentUserName,employee_email:readSessionValue("vsph_user_email")||"",company_name:contact?.tenant?.tenant_name||"VSPH CRM",company_tagline:"Innovation. Technology. People.",company_website:"vsph.in",current_date:new Date(now).toLocaleDateString(),to:recipient||""};}
  function selectTemplate(id){setEmail(prev=>({...prev,templateId:id}));}
  const selectedTemplate=emailTemplates.find(t=>t.email_template_id===email.templateId);
  const interpolate=(value)=>String(value||"").replace(/\{\{(\w+)\}\}/g,(_,key)=>emailVariables(recipients.includes(email.recipient)?email.recipient:recipients[0])[key]??"");
  const actions=[...(canCall ? [{id:"call",label:"Log a call"}] : []),...(canTask ? [{id:"task",label:"Create task"}] : []),...(canCall?[{id:"email",label:"Compose email"}]:[]),...(canCall?[{id:"note",label:"Add note"},{id:"email-log",label:"Log email"},{id:"meeting",label:"Log meeting"},{id:"linkedin",label:"Log LinkedIn interaction"}]:[])];
  return <div className="cw-workspace">
    <nav className="cw-breadcrumb" aria-label="Breadcrumb"><button type="button" className="cw-back" onClick={closeWorkspace} disabled={!!pending||Object.values(taskWrites).some(Boolean)}><ArrowLeft size={16}/> Contacts</button>{neighbors&&<div className="cw-record-navigation"><button type="button" className="cw-icon" aria-label="Previous contact" disabled={!neighbors.previous||!!pending||deletePending||Object.values(taskWrites).some(Boolean)} onClick={()=>navigateContact(neighbors.previous)}><ChevronLeft size={18} aria-hidden="true"/></button><span className="cw-muted" aria-label="Position on current list page">{neighbors.position} / {neighbors.total}</span><button type="button" className="cw-icon" aria-label="Next contact" disabled={!neighbors.next||!!pending||deletePending||Object.values(taskWrites).some(Boolean)} onClick={()=>navigateContact(neighbors.next)}><ChevronRight size={18} aria-hidden="true"/></button></div>}</nav>
    {loading ? <ContactSkeleton view={tab}/> : !contact ? <div className="cw-panel cw-empty"><h2>Contact unavailable</h2><p role="alert">{loadError || "Contact not found."}</p><button type="button" className="cw-button" onClick={()=>{setLoading(true);setRevision(v=>v+1);}}>Retry</button></div> : <>
      {loadError && <p className="cw-error" role="alert">{loadError}</p>}
      <div className="cw-grid cw-record-grid">
      <section className="cw-panel cw-identity">
        <div className="cw-identity-main"><div className="cw-avatar" aria-hidden="true">{initials}</div><div className="cw-identity-text"><h1>{name}</h1><div className="cw-identity-meta"><span>{contact.contact_code || "No record code"}</span></div></div></div>
        <div className="cw-identity-side"><div className="cw-actions">
          {canEdit && <button type="button" className="cw-button" onClick={event=>{dialogOpener.current=event.currentTarget;setFocusCampaign(false);setEdit(true);}}>Edit contact</button>}
          {(canAssignCampaign || canDelete || contact.contact_code) && <MoreActions canEdit={canAssignCampaign} canDelete={canDelete} code={contact.contact_code} onCampaign={opener=>{dialogOpener.current=opener;setFocusCampaign(true);setEdit(true);}} onDelete={opener=>{dialogOpener.current=opener;setDeleteError("");setDeleting(true);}}/>}
        </div></div>
      </section>

        <section className="cw-panel cw-activity cw-work-area" aria-label={tab==="activity"?"Activity history":"Opportunities"}>
          <div className="cw-panel-header cw-work-area-header">
            <WorkspaceSwitch view={tab} onChange={switchWorkspace} contentId={workspaceContentId} canViewOpportunities={canViewOpportunities}/>
            {tab==="activity"&&<ActivityControls view={activityView} filter={filter} canViewTasks={canViewTasks} actions={actions} onAddActivity={openComposer}/>}
          </div>
          <div id={workspaceContentId} className="cw-work-area-content">
            {tab==="activity" ? <Timeline calls={calls} tasks={tasks} entries={entries} loading={historyLoading} error={historyError} filter={filter} setFilter={value=>{setNewActivity(null);setFilter(value);}} canViewTasks={canViewTasks} onRetry={retryHistory} newActivity={newActivity} taskAccess={taskAccess} taskWrites={taskWrites} taskErrors={taskErrors} onTaskToggle={toggleTask} onTaskStatus={changeTaskStatus} onTaskEdit={editTask} feedback={!mode?feedback:""} lastCreated={lastCreated} view={activityView} now={now} userId={currentUserId} canEditEntry={canEdit} canDeleteEntry={canDelete} onEntryCorrection={(record,remove,opener)=>{dialogOpener.current=opener;setEntryCorrection({record,remove});}}/> : <Opportunities opportunities={contact.opportunities || []} canCreate={canCreateOpportunity} canEdit={canEditOpportunity} onCreate={e=>{dialogOpener.current=e.currentTarget;setOpportunityEditing({record:null});}} onEdit={(record,opener)=>{dialogOpener.current=opener;setOpportunityEditing({record});}}/>}
          </div>
        </section>
        <ContactProperties contact={contact} summary={summary} historyLoading={historyLoading} historyError={historyError} canViewTasks={canViewTasks} onEditRelationship={canEdit?e=>{dialogOpener.current=e.currentTarget;setRelationshipEditing(true);}:undefined}/>
      </div>
      {entryCorrection&&<EntryCorrectionDialog record={entryCorrection.record} remove={entryCorrection.remove} endpoint={endpoint} onClose={()=>setEntryCorrection(null)} onSaved={record=>setEntries(prev=>record?prev.map(x=>x.entry_id===record.entry_id?record:x):prev.filter(x=>x.entry_id!==entryCorrection.record.entry_id))}/>}
      {opportunityEditing&&<OpportunityEditor record={opportunityEditing.record} endpoint={endpoint} onClose={()=>setOpportunityEditing(null)} onSaved={record=>setContact(prev=>({...prev,opportunities:[record,...(prev.opportunities||[]).filter(o=>o.opportunity_id!==record.opportunity_id)]}))}/>}
      {relationshipEditing&&<RelationshipEditor value={contact.contact_relationship_stage} endpoint={endpoint} onClose={()=>setRelationshipEditing(false)} onSaved={stage=>setContact(prev=>({...prev,contact_relationship_stage:stage}))}/>}
      {mode&&<ActivityComposerDialog key={mode} title={actions.find(a=>a.id===mode)?.label} mode={mode} formId={composerId} pending={!!pending} saved={!!savedMode} submitLabel={mode==="call"&&call.followup?"Save call and follow-up":entryModes[mode]?"Save activity":mode==="email"?"Send email":undefined} disabled={(mode!=="email"&&historyLoading)||(mode==="email"&&!recipients.length)} onClose={finishComposer}>
        <form ref={composer} id={composerId} onSubmit={submit} noValidate className="cw-form cw-activity-form" aria-busy={!!pending}>
                <fieldset key={mode} disabled={!!pending||!!savedMode} className="cw-form-fields">
                {mode==="call" ? <>
                  <label><span className="cw-field-label">Subject / outcome <span className="cw-required" aria-hidden="true">*</span></span><input required maxLength={191} name="subject" value={call.subject} aria-invalid={!!fieldErrors.subject} aria-describedby={fieldErrors.subject ? composerId+"-subject-error" : undefined} onChange={e=>{setCall({...call,subject:e.target.value});if(e.target.value.trim())setFieldErrors(prev=>({...prev,subject:undefined}));}} placeholder="Enter an outcome or call subject"/>{fieldErrors.subject && <span className="cw-field-error" id={composerId+"-subject-error"} role="alert">{fieldErrors.subject}</span>}</label>
                  <label><span className="cw-field-label">Call notes <span className="cw-required" aria-hidden="true">*</span></span><textarea required maxLength={191} rows={4} name="description" value={call.description} aria-invalid={!!fieldErrors.description} aria-describedby={fieldErrors.description ? composerId+"-description-error" : undefined} onChange={e=>{setCall({...call,description:e.target.value});if(e.target.value.trim())setFieldErrors(prev=>({...prev,description:undefined}));}} placeholder="What was discussed?"/>{fieldErrors.description && <span className="cw-field-error" id={composerId+"-description-error"} role="alert">{fieldErrors.description}</span>}</label>
                  <CallOutcomeFields draft={call} setDraft={setCall} canEdit={canEdit} canTask={canTask} role={taskAccess.role} tenantId={contact.tenant_fk}/>
                </> : mode==="task" ? <>
                  <label><span className="cw-field-label">Task subject <span className="cw-required" aria-hidden="true">*</span></span><input required name="subject" value={task.subject} aria-invalid={!!fieldErrors.subject} aria-describedby={fieldErrors.subject ? composerId+"-subject-error" : undefined} onChange={e=>{setTask({...task,subject:e.target.value});if(e.target.value.trim())setFieldErrors(prev=>({...prev,subject:undefined}));}} placeholder="Enter a task name"/>{fieldErrors.subject && <span className="cw-field-error" id={composerId+"-subject-error"} role="alert">{fieldErrors.subject}</span>}</label>
                  <TaskAssigneeField draft={task} setDraft={setTask} role={taskAccess.role} tenantId={contact.tenant_fk}/>
                  <label>Priority<select value={task.priority} onChange={e=>setTask({...task,priority:e.target.value})}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option></select></label>
                  <div className="cw-date-row"><label>Due date<input type="date" value={task.date} onChange={e=>setTask({...task,date:e.target.value})}/></label><label>Due time<input type="time" value={task.time} onChange={e=>setTask({...task,time:e.target.value})} disabled={!task.date}/></label></div>
                  <label>Description<textarea rows={3} value={task.description} onChange={e=>setTask({...task,description:e.target.value})} placeholder="What needs to be done?"/></label>
                </> : entryModes[mode] ? <EntryFields draft={entryDrafts[mode]||blankEntry} onChange={draft=>setEntryDrafts(prev=>({...prev,[mode]:draft}))} kind={entryModes[mode]}/> : <>
                  <label>Recipient<select aria-label="Recipient" value={recipients.includes(email.recipient) ? email.recipient : recipients[0] || ""} onChange={e=>setEmail({...email,recipient:e.target.value})}>{recipients.length ? recipients.map(address=><option key={address}>{address}</option>) : <option value="">No usable email address</option>}</select></label>
                  <label>Email template<select aria-label="Email template" value={email.templateId} onChange={e=>selectTemplate(e.target.value)}><option value="">Write a message</option>{emailTemplates.map(t=><option key={t.email_template_id} value={t.email_template_id}>{t.name}</option>)}</select></label>
                  {templateError&&<p className="cw-muted" role="status">{templateError} You can still write a message.</p>}
                  <label>Subject<input value={selectedTemplate?interpolate(selectedTemplate.subject):email.subject} readOnly={!!selectedTemplate} onChange={e=>setEmail({...email,subject:e.target.value})} placeholder="Email subject"/></label>
                  <label>Message<textarea aria-label="Message" rows={5} value={selectedTemplate?interpolate(selectedTemplate.body_text||selectedTemplate.body_html):email.body} readOnly={!!selectedTemplate} onChange={e=>setEmail({...email,body:e.target.value})} placeholder="Write your email…"/></label>
                  {selectedTemplate&&<p className="cw-muted">Template preview. CRM sends the saved template; choose Write a message for custom text.</p>}
                  <p className="cw-muted">Sends email through CRM. Sending does not create a timeline entry.</p>
                </>}
                </fieldset>
          {saveError&&<p role="alert" className="cw-error">{saveError}</p>}
          {mode==="email"&&feedback&&<p className="cw-muted" role="status">{feedback}</p>}
        </form>
      </ActivityComposerDialog>}
      {edit && canEdit && <AddContactModal isOpen={edit} onClose={()=>{setEdit(false);if(editSaved.current){editSaved.current=false;setRevision(v=>v+1);onChanged?.();}}} onSuccess={()=>{editSaved.current=true;}} contactToEdit={contact} workspaceMotion focusCampaign={focusCampaign} canAssignCampaign={canAssignCampaign}/>}
      {taskEditing && <ContactTaskEditor key={taskEditing.task_id} record={taskEditing} access={taskAccess} onClose={()=>setTaskEditing(null)} onSave={saveTaskPatch}/>}
      {deleting && canDelete && <DeleteDialog name={name} pending={deletePending} error={deleteError} onClose={()=>setDeleting(false)} onConfirm={confirmDelete}/>}
    </>}
  </div>;
}
