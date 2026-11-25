import { useLayoutEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  headerActions, 
  children, 
  footer, 
  widthClass = 'w-full max-w-md',
  workspaceMotion = false,
  busy = false,
  closing = false
}) => {
  const dialogRef = useRef(null);
  const titleId = useId();
  // Layout cleanup runs while the native dialog is still connected. Passive
  // cleanup after unmount can lose native focus restoration.
  useLayoutEffect(() => {
    if (!workspaceMotion || !isOpen) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [workspaceMotion, isOpen]);
  if (!isOpen) return null;
  if (workspaceMotion) return (
    <dialog ref={dialogRef} className="cw-edit-dialog" data-closing={closing} aria-busy={busy||closing} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy && !closing) onClose(); }}>
      <div className="cw-edit-inner" inert={closing}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 shrink-0 gap-2">
          <h2 id={titleId} className="text-vsph-navy text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2 flex-wrap justify-end">{headerActions}<button type="button" className="cw-icon" aria-label="Close dialog" onClick={onClose} disabled={busy||closing}><X size={18}/></button></div>
        </div>
        <div className="cw-edit-scroll">{children}</div>
        {footer && <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3 bg-vsph-grey shrink-0">{footer}</div>}
      </div>
    </dialog>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vsph-navy/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-lg border border-slate-200 ${widthClass} max-h-[90vh] flex flex-col`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 rounded-t-lg shrink-0">
          <h2 className="text-vsph-navy text-lg font-semibold tracking-tight">{title}</h2>
          <div className="flex items-center gap-3">
            {headerActions}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-vsph-navy hover:bg-vsph-grey rounded transition-colors bg-white border border-slate-200 shadow-sm shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-0 overflow-y-auto flex-1 bg-white">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-vsph-grey rounded-b-lg z-10 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
