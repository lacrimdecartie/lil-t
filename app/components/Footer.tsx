'use client'
import React from "react";
export default function Footer(){
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 mt-8">
      <div className="max-w-6xl mx-auto px-4 py-4 text-sm flex items-center gap-3">
        <span>© {new Date().getFullYear()} lil-t</span>
        <span aria-hidden>•</span>
        <button className="underline" onClick={()=>dispatchEvent(new CustomEvent("toast",{detail:{msg:"Erfolg!"}}))}>Test Erfolg</button>
        <span aria-hidden>•</span>
        <button className="underline" onClick={()=>dispatchEvent(new CustomEvent("toast",{detail:{msg:"Fehler!", ok:false}}))}>Test Fehler</button>
      </div>
    </footer>
  );
}