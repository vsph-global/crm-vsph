import { useCallback, useLayoutEffect, useEffect, useRef, useState } from "react";
export function useDialogExit(onClose, enabled=true) {
  const [closing,setClosing]=useState(false);
  const lock=useRef(false), timer=useRef(null), callback=useRef(onClose);
  useLayoutEffect(()=>{callback.current=onClose;},[onClose]);
  useEffect(()=>()=>{clearTimeout(timer.current);lock.current=false;},[]);
  const close=useCallback(()=>{
    if(lock.current)return;
    if(!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches){callback.current();return;}
    lock.current=true;setClosing(true);
    timer.current=setTimeout(()=>{callback.current();},180);
  },[enabled]);
  return {closing,close};
}
