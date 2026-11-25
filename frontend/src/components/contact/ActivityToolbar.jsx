import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ArrowDownAZ, ArrowUpAZ, Check, ChevronDown, List, Mail, Phone, Plus, SlidersHorizontal, CheckCircle, StickyNote, Calendar, MessageSquare } from "lucide-react";

import { menuFocusIndex } from "./contactMotionUtils.js";

const sorts=[["newest","Newest first",ArrowDownWideNarrow],["oldest","Oldest first",ArrowUpWideNarrow],["az","Alphabetical (A–Z)",ArrowDownAZ],["za","Alphabetical (Z–A)",ArrowUpAZ]];
const statuses=[["all","All statuses"],["TODO","Pending"],["IN_PROGRESS","In progress"],["BLOCKED","Blocked"],["COMPLETED","Completed"]];
const deadlines=[["all","Any due date"],["overdue","Overdue"],["today","Due today"],["upcoming","Upcoming"],["unscheduled","No due date"]];
const priorities=[["all","All priorities"],["HIGH","High"],["NORMAL","Normal"],["LOW","Low"]];

function Options({legend,options,value,onChange,type}) {
  const id=useId();
  return <fieldset className={"cw-filter-options cw-filter-"+type}>
    <legend>{legend}</legend>
    <div className="cw-filter-option-list">{options.map(([key,label,Icon])=><label key={key} data-selected={value===key} className="cw-filter-option">
      <input type="radio" name={id} value={key} checked={value===key} onChange={()=>onChange(key)}/>
      {type==="sort"&&<Icon size={16} aria-hidden="true"/>}
      {type==="status"&&(key==="all"?<List size={16} aria-hidden="true"/>:<span className="cw-filter-status-dot" data-status={key} aria-hidden="true"/>)}
      <span>{label}</span>
      {type!=="priority"&&<Check size={16} className="cw-filter-option-check" aria-hidden="true"/>}
    </label>)}</div>
  </fieldset>;
}

export function ActivityFilters({open,onOpen,sort,setSort,status,setStatus,priority,setPriority,deadline,setDeadline,mine,setMine,taskFilters,count,onReset}) {
  const root=useRef(null), trigger=useRef(null), id=useId();
  const [placement,setPlacement]=useState({side:"bottom",height:480});
  useLayoutEffect(()=>{
    if(!open)return;
    function measure(){
      const rect=root.current?.closest(".cw-history-controls")?.getBoundingClientRect();
      if(!rect)return;
      const below=window.innerHeight-rect.bottom-16, above=rect.top-16;
      const side=below<320&&above>below?"top":"bottom";
      const height=Math.max(96,side==="top"?above:below);
      setPlacement(prev=>prev.side===side&&prev.height===height?prev:{side,height});
    }
    let frame;
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    measure();window.addEventListener("resize",schedule);window.addEventListener("scroll",schedule,true);
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",schedule);window.removeEventListener("scroll",schedule,true);};
  },[open]);
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!root.current?.contains(e.target))onOpen(false);};
    const escape=e=>{if(e.key==="Escape"){e.preventDefault();onOpen(false);trigger.current?.focus();}};
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[open,onOpen]);
  return <div className="cw-filter-anchor cw-menu-anchor" ref={root}>
    <button ref={trigger} type="button" className="cw-button cw-filter-button" aria-expanded={open} aria-controls={id} onClick={()=>onOpen(!open)}><SlidersHorizontal size={16} aria-hidden="true"/> Filter{count>0&&<span className="cw-filter-count" aria-label={count+" active filters"}>{count}</span>}</button>
    <div id={id} className="cw-menu cw-filter-menu" data-open={open} data-align="right" data-side={placement.side} style={{"--cw-filter-height":placement.height+"px"}} inert={!open} aria-hidden={!open}>
      <div className="cw-filter-heading"><strong>Filter and sort</strong><button type="button" className="cw-filter-reset" onClick={onReset}>Reset filters</button></div>
      <div className="cw-filter-scroll">
        <Options legend="Sort by" type="sort" options={sorts} value={sort} onChange={setSort}/>
        {taskFilters&&<><Options legend="Task status" type="status" options={statuses} value={status} onChange={setStatus}/><Options legend="Priority" type="priority" options={priorities} value={priority} onChange={setPriority}/><Options legend="Due date" type="deadline" options={deadlines} value={deadline} onChange={setDeadline}/><label className="cw-filter-mine"><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)}/> Assigned to me</label></>}
      </div>
      <div className="cw-filter-footer">{count?count+" active "+(count===1?"selection":"selections"):"Default view"}</div>
    </div>
  </div>;
}

export function AddActivityMenu({actions,onSelect,onOpen}) {
  const [open,setOpen]=useState(false), [side,setSide]=useState("bottom");
  const root=useRef(null),trigger=useRef(null),menu=useRef(null),id=useId();
  const icons={call:Phone,task:CheckCircle,email:Mail,note:StickyNote,"email-log":Mail,meeting:Calendar,linkedin:MessageSquare};
  const options=()=>Array.from(menu.current?.querySelectorAll('[role="menuitem"]')||[]);
  function show(last=false){onOpen?.();const rect=root.current?.closest(".cw-history-controls")?.getBoundingClientRect();setSide(rect&&window.innerHeight-rect.bottom<160&&rect.top>160?"top":"bottom");setOpen(true);requestAnimationFrame(()=>{const nodes=options();nodes[last?nodes.length-1:0]?.focus();});}
  function close(focus=false){setOpen(false);if(focus)trigger.current?.focus();}
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};
    document.addEventListener("pointerdown",outside);
    return ()=>document.removeEventListener("pointerdown",outside);
  },[open]);
  function keys(e){
    if(!open)return;
    if(e.key==="Escape"){e.preventDefault();close(true);}
    else if(e.key==="Tab")close(true);
    else if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){
      e.preventDefault();const nodes=options(),i=nodes.indexOf(document.activeElement);
      const next = menuFocusIndex(e.key, i, nodes.length);
      if (next !== null) nodes[next]?.focus();
    }
  }
  return <div className="cw-menu-anchor cw-add-activity-anchor" ref={root} onKeyDown={keys}>
    <button type="button" ref={trigger} className="cw-button cw-primary cw-add-activity" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={()=>open?close(true):show()} onKeyDown={e=>{if(!open&&["ArrowDown","ArrowUp"].includes(e.key)){e.preventDefault();e.stopPropagation();show(e.key==="ArrowUp");}}}><Plus size={18} aria-hidden="true"/> Add activity <ChevronDown className="cw-chevron" size={16} aria-hidden="true"/></button>
    <div ref={menu} id={id} className="cw-menu cw-add-menu" role="menu" aria-label="Add activity" data-side={side} data-open={open} data-align="right" inert={!open} aria-hidden={!open}>
      {actions.map(({id:kind,label})=>{const Icon=icons[kind];return <button type="button" key={kind} role="menuitem" tabIndex={-1} onClick={()=>{close(true);onSelect(kind,trigger.current);}}><Icon size={16} aria-hidden="true"/>{label}</button>;})}
    </div>
  </div>;
}
