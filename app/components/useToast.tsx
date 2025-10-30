"use client";
import React, {useEffect, useState} from "react";

export function useToast(){
  const [msg, setMsg] = useState<string|undefined>();
  const [ok, setOk] = useState(true);
  useEffect(()=>{
    const on = (e: Event)=> {
      const de = e as CustomEvent<{msg:string, ok?:boolean}>;
      setMsg(de.detail?.msg); setOk(de.detail?.ok !== false);
      setTimeout(()=>setMsg(undefined), 2500);
    };
    addEventListener("toast", on as any);
    return ()=> removeEventListener("toast", on as any);
  },[]);
  return {msg, ok};
}

export function ToastContainer(){
  const {msg, ok} = useToast();
  if(!msg) return null;
  return (
    <div role="status" aria-live="polite"
      className="fixed right-4 bottom-4 max-w-sm rounded-lg shadow-lg px-3 py-2 text-sm
                 text-white"
      style={{background: ok ? "#111827" : "#991b1b"}}
    >
      {msg}
    </div>
  );
}