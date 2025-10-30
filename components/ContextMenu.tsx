'use client'
// @ts-nocheck
"use client";
import React, {useEffect, useRef} from "react";

/** Unterstützte Item-Typen */
export type MenuItem =
  | { type: "action"; label: string; onClick: () => void; disabled?: boolean }
  | { type: "color";  label: string; onChange: (hex: string) => void }
  | { type: "separator" };

type Props = {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  items: MenuItem[];
};

const SWATCHES = [
  "#FDE68A","#FBBF24","#34D399","#60A5FA","#A78BFA",
  "#EC4899","#F87171","#9CA3AF","#374151","#111827"
];

export default function ContextMenu({ open, x, y, onClose, items }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  // sanftes Pop-in
  useEffect(() => {
    if (!open || !boxRef.current) return;
    const el = boxRef.current;
    el.style.opacity = "0";
    el.style.transform = "scale(0.98)";
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "scale(1)";
    });
  }, [open]);

  // ESC schließt
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Menübreite für Clamping
  const width = 360;

  return (
    <div
      className="fixed inset-0 z-[9998]"
      // Klick auf Overlay schließt – MouseDown, damit Klicks innen gestoppt werden können
      onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        ref={boxRef}
        // Klicks im Content dürfen NICHT das Overlay schließen
        onMouseDown={(e)=>e.stopPropagation()}
        onMouseUp={(e)=>e.stopPropagation()}
        className="
          absolute rounded-2xl shadow-xl select-none overflow-hidden
          backdrop-blur-md border
          bg-white/85 text-neutral-900 border-black/10
          dark:bg-neutral-900/90 dark:text-neutral-100 dark:border-white/10
        "
        style={{
          left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
          top:  Math.max(8, Math.min(y, window.innerHeight - 8)),
          width
        }}
      >
        {/* Inhalt */}
        <div className="p-4">
          {items.map((it, idx) => {
            if (it.type === "separator") {
              return <div key={"sep"+idx} className="my-2 h-px bg-black/10 dark:bg-white/10" />;
            }
            if (it.type === "action") {
              return (
                <button
                  key={"act"+idx}
                  disabled={!!it.disabled}
                  onMouseDown={(e)=>e.stopPropagation()}
                  onMouseUp={(e)=>{ e.stopPropagation(); if(!it.disabled) it.onClick(); onClose(); }}
                  className={[
                    "w-full text-left px-3 py-2 rounded-lg transition",
                    "hover:bg-black/5 dark:hover:bg-white/5",
                    it.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                  ].join(" ")}
                >
                  {it.label}
                </button>
              );
            }
            if (it.type === "color") {
              return (
                <div key={"col"+idx} className="mb-1">
                  <div className="text-xs opacity-70 mb-2 px-1">{it.label}</div>
                  <div className="flex gap-2 flex-wrap">
                    {SWATCHES.map((c) => (
                      <button
                        key={c}
                        title={c}
                        onMouseDown={(e)=>e.stopPropagation()}
                        onMouseUp={(e)=>{ e.stopPropagation(); it.onChange(c); onClose(); }}
                        className="
                          w-8 h-8 rounded-full ring-1 ring-black/10 dark:ring-white/10
                          hover:scale-110 active:scale-95 transition
                        "
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}
