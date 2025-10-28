// @ts-nocheck
"use client";

import React, { useEffect, useRef } from "react";

export type MenuItem =
  | { type: "action"; label: string; onClick: () => void }
  | { type: "color"; label: string; onChange: (hex: string) => void }
  | { type: "separator" };

type Props = { open: boolean; x: number; y: number; onClose: () => void; items: MenuItem[]; };

const SWATCHES = ["#FDE68A","#FBBF24","#34D399","#60A5FA","#A78BFA","#EC4899","#F87171","#9CA3AF","#111827","#FFFFFF"];

export default function ContextMenu({ open, x, y, onClose, items }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !boxRef.current) return;
    const el = boxRef.current;
    el.style.opacity = "0";
    el.style.transform = "scale(0.96)";
    requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "scale(1)"; });
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998]"
      onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
      onContextMenu={(e) => { e.preventDefault(); onClose(); }}
    >
      <div
        ref={boxRef}
        className="absolute z-[9999] origin-top-left bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-white/60 min-w-[240px] p-2"
        style={{ left: x, top: y, transition: "transform 130ms cubic-bezier(.2,.9,.2,1), opacity 130ms ease" }}
        onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        {items.map((it, idx) => {
          if (it.type === "separator") return <div key={idx} className="my-2 border-t border-gray-200/70" />;
          if (it.type === "action") {
            return (
              <button
                key={idx}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 active:scale-[0.99] transition"
                onClick={() => { it.onClick(); onClose(); }}
              >
                {it.label}
              </button>
            );
          }
          return (
            <div key={idx} className="px-3 py-2">
              <div className="text-xs text-gray-500 mb-2">{it.label}</div>
              <div className="flex gap-2 flex-wrap">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    className="h-7 w-7 rounded-lg border border-black/10 hover:scale-[1.07] transition"
                    style={{ backgroundColor: c }}
                    onClick={() => { it.onChange(c); onClose(); }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
