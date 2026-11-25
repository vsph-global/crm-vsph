import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy } from "lucide-react";
import { selectionIndicator } from "./contactMotionUtils.js";

// The selection state and content update immediately; only the underline moves.
export function SlidingTabs({ className, label, options, value, onChange }) {
  const root = useRef(null), selected = useRef(null);
  const [position,setPosition] = useState(null);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    let frame;
    function measure() {
      const next = selectionIndicator(node.getBoundingClientRect(), selected.current?.getBoundingClientRect());
      setPosition(prev => prev && next && prev.x===next.x && prev.y===next.y && prev.width===next.width ? prev : next);
    }
    const schedule = () => { cancelAnimationFrame(frame); frame=requestAnimationFrame(measure); };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    for (const button of node.querySelectorAll("button")) observer.observe(button);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value,options.length]);
  return <div ref={root} className={"cw-tabs cw-sliding-tabs "+className} role="group" aria-label={label} data-measured={!!position}>
    {options.map(([id,text])=><button ref={id===value ? selected : null} type="button" key={id} aria-pressed={id===value} onClick={()=>onChange(id)}>{text}</button>)}
    {position && <span className="cw-sliding-indicator" aria-hidden="true" style={{width:position.width,transform:`translate(${position.x}px,${position.y}px)`}}/>}
  </div>;
}

export function CopyGlyph({ copied }) {
  return <span className="cw-copy-glyph" data-copied={copied} aria-hidden="true">
    <Copy size={16} className="cw-copy-original"/>
    <svg className="cw-copy-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" pathLength="1"/></svg>
  </span>;
}

export function SaveGlyph({ state }) {
  if(state!=="pending" && state!=="saved") return null;
  return <span className="cw-save-glyph" aria-hidden="true">
    {state==="pending" ? <span className="cw-saving-spinner"/> : <Check size={16} className="cw-save-check"/>}
  </span>;
}

// Shared hover delay; focus is immediate and the tooltip is hoverable/dismissible.
let lastTooltipClose = -Infinity;
function recordTooltipClose(){lastTooltipClose=Date.now();}
function withinTooltipGrace(){return Date.now()-lastTooltipClose<300;}
function TooltipAnchor({children,...handlers}){return cloneElement(children,handlers);}
export function Tooltip({ text, children }) {
  const id=useId(), anchor=useRef(null), bubble=useRef(null), timer=useRef(null);
  const [open,setOpen]=useState(false), [position,setPosition]=useState(null);
  const focused=useRef(false), hovered=useRef(false), bubbleHovered=useRef(false);
  function close() {clearTimeout(timer.current);setOpen(false);recordTooltipClose();}
  function show(event, immediate=false) {
    anchor.current=event.currentTarget;
    clearTimeout(timer.current);
    if (immediate || withinTooltipGrace()) setOpen(true);
    else timer.current=setTimeout(()=>setOpen(true),350);
  }
  function scheduleClose() {
    clearTimeout(timer.current);
    timer.current=setTimeout(()=>{if(!focused.current&&!hovered.current&&!bubbleHovered.current)close();},160);
  }
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useLayoutEffect(()=>{
    if(!open || !anchor.current || !bubble.current)return;
    const update=()=>{
      const a=anchor.current?.getBoundingClientRect(), b=bubble.current?.getBoundingClientRect();
      if(!a||!b)return;
      const above=a.top>=b.height+12;
      setPosition({left:Math.max(8,Math.min(a.left+(a.width-b.width)/2,window.innerWidth-b.width-8)),top:above?a.top-b.height-6:Math.min(a.bottom+6,window.innerHeight-b.height-8)});
    };
    update();
    window.addEventListener("resize",update);window.addEventListener("scroll",update,true);
    return ()=>{window.removeEventListener("resize",update);window.removeEventListener("scroll",update,true);};
  },[open,text]);
  useEffect(()=>{
    if(!open)return;
    const dismiss=e=>{if(e.key==="Escape"){clearTimeout(timer.current);setOpen(false);recordTooltipClose();}};
    document.addEventListener("keydown",dismiss);
    return ()=>document.removeEventListener("keydown",dismiss);
  },[open]);
  return <><TooltipAnchor aria-describedby={[children.props["aria-describedby"],open?id:null].filter(Boolean).join(" ")||undefined}
    onPointerEnter={e=>{children.props.onPointerEnter?.(e);if(e.pointerType==="touch")return;hovered.current=true;show(e);}}
    onPointerLeave={e=>{children.props.onPointerLeave?.(e);hovered.current=false;scheduleClose();}}
    onFocus={e=>{children.props.onFocus?.(e);focused.current=true;show(e,true);}}
    onBlur={e=>{children.props.onBlur?.(e);focused.current=false;scheduleClose();}}
    onClick={e=>{children.props.onClick?.(e);if(e.pointerType==="touch")close();}}
  >{children}</TooltipAnchor>{open&&createPortal(<span id={id} role="tooltip" ref={bubble} className="cw-tooltip" style={{left:position?.left??8,top:position?.top??8,visibility:position?"visible":"hidden"}} onPointerEnter={()=>{bubbleHovered.current=true;clearTimeout(timer.current);}} onPointerLeave={()=>{bubbleHovered.current=false;scheduleClose();}}>{text}</span>,document.body)}</>;
}

export function ContactSkeleton({ history=false, view="activity" }) {
  const bar=(width)=><span className="cw-skeleton-bar" style={{width}}/>;
  const events=<div className="cw-skeleton-events" aria-hidden="true">{[0,1,2].map(i=><div key={i} className="cw-skeleton-event"><span className="cw-skeleton-dot"/><div>{bar("65%")}{bar("28%")}</div></div>)}</div>;
  if(history)return <div className="cw-skeleton-history" role="status"><span className="cw-sr">Loading activity…</span>{events}</div>;
  return <div className="cw-skeleton-layout" role="status" aria-busy="true"><span className="cw-sr">Loading contact…</span>
    <div className="cw-grid cw-record-grid" aria-hidden="true">
      <div className="cw-panel cw-identity"><div className="cw-identity-main"><span className="cw-skeleton-avatar"/><div className="cw-skeleton-identity">{bar("90%")}{bar("45%")}</div></div><div className="cw-identity-side cw-skeleton-identity-actions"><span className="cw-skeleton-action"/><span className="cw-skeleton-action"/></div></div>
      <div className="cw-panel cw-activity cw-work-area cw-skeleton-history">
        <div className="cw-skeleton-history-heading"><span className="cw-skeleton-action cw-skeleton-switch"/>{view==="activity"&&<div className="cw-skeleton-toolbar">{[0,1,2].map(i=><span className="cw-skeleton-action" key={i}/>)}</div>}</div>
        {view==="activity"?<><div className="cw-skeleton-history-tabs">{[0,1,2].map(i=><span className="cw-skeleton-bar" key={i}/>)}</div>{events}</>:<><div className="cw-skeleton-opportunity-heading">{bar("45%")}{bar("15%")}</div>{[0,1].map(i=><div key={i} className="cw-skeleton-opportunity-row"><div>{bar("75%")}{bar("35%")}</div>{bar("25%")}</div>)}</>}
      </div>
      <div className="cw-panel cw-properties cw-skeleton-properties">{bar("45%")}{Array.from({length:6},(_,i)=><div className="cw-skeleton-property" key={i}>{bar("35%")}{bar("70%")}</div>)}</div>
    </div>
  </div>;
}
