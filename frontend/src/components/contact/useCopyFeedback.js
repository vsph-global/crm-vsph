import { useEffect, useRef, useState } from "react";

// A timer is restarted on each successful copy, not on each render.
export function useCopyFeedback(value) {
  const [result,setResult] = useState(null);
  const timer=useRef(null), alive=useRef(true), attempt=useRef(0);
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;clearTimeout(timer.current);};},[]);
  useEffect(()=>{attempt.current++;clearTimeout(timer.current);},[value]);
  async function copy() {
    const ticket=++attempt.current;
    try {
      await navigator.clipboard.writeText(String(value));
      if (!alive.current || ticket!==attempt.current) return false;
      clearTimeout(timer.current);setResult({value,status:"copied"});
      timer.current=setTimeout(()=>{if(alive.current)setResult(null);},1500);
      return true;
    } catch {
      if (alive.current && ticket===attempt.current) {clearTimeout(timer.current);setResult({value,status:"error"});}
      return false;
    }
  }
  return {copied:result?.value===value && result?.status==="copied",error:result?.value===value && result?.status==="error",copy};
}

