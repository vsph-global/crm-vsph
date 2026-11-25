import { useEffect } from "react";
import Modal from "../ui/Modal";
import { SaveGlyph } from "./ContactMotion";
import { useDialogExit } from "./useDialogExit";

export function ActivityComposerDialog({title,mode,formId,pending,saved,disabled,onClose,children,submitLabel,destructive=false}) {
  const {closing,close}=useDialogExit(onClose);
  const locked=pending||saved||closing;
  useEffect(()=>{
    if(!saved)return;
    const timer=setTimeout(close,window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:650);
    return ()=>clearTimeout(timer);
  },[saved,close]);
  const state=pending?"pending":saved?"saved":"idle";
  const label=pending?"Saving…":saved?"Saved":submitLabel|| (mode==="call"?"Save call":mode==="task"?"Create task":"Send email");
  return <Modal isOpen workspaceMotion busy={pending||saved} closing={closing} title={title} onClose={()=>{if(!locked)close();}} footer={<>
    <button type="button" className="cw-button" disabled={locked} onClick={close}>Cancel</button>
    <button type="submit" form={formId} className={"cw-button cw-primary cw-save-button"+(destructive&&!saved?" cw-destructive":"")} data-state={state} disabled={locked||disabled}><SaveGlyph state={state}/>{label}</button>
  </>}>{children}</Modal>;
}
