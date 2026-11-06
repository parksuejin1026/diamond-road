'use client';
import {useEffect,useId,useRef,type ReactNode} from 'react';
export default function ConfirmDialog({title,description,confirmLabel,cancelLabel='계속 플레이',busy=false,error,onCancel,onConfirm,children}:{title:string;description:string;confirmLabel:string;cancelLabel?:string;busy?:boolean;error?:string;onCancel:()=>void;onConfirm:()=>void;children?:ReactNode}){
  const dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null),id=useId();
  const cancelAction=useRef(onCancel);cancelAction.current=onCancel;
  useEffect(()=>{
    const node=dialog.current;if(!node)return;
    const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    node.showModal();cancel.current?.focus();document.body.style.overflow='hidden';
    return()=>{if(node.open)node.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
  },[]);
  return <dialog ref={dialog} className="confirmDialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onKeyDown={e=>{
    if(e.key!=='Tab')return;
    const controls=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length);
    const first=controls[0],last=controls.at(-1);if(!first){e.preventDefault();return;}
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }} onCancel={e=>{e.preventDefault();if(!busy)cancelAction.current();}}>
    <div className="dialogEmblem" aria-hidden="true">◆</div><p className="eyebrow">CAREER DECISION</p><h2 id={`${id}-title`}>{title}</h2><p id={`${id}-description`}>{description}</p>
    {children}{error&&<p className="error" role="alert">{error}</p>}
    <div className="dialogActions"><button ref={cancel} disabled={busy} onClick={onCancel}>{cancelLabel}</button><button className="confirmDanger" disabled={busy} onClick={onConfirm}>{busy?'저장 중…':confirmLabel}</button></div>
  </dialog>;
}
