// @ts-nocheck
"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";

// --- Farb-Utils ---
function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const i = parseInt(n, 16);
  return { r: (i >> 16) & 255, g: (i >> 8) & 255, b: i & 255 };
}
function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function readableText(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000; // YIQ
  return yiq >= 160 ? "#0B1220" : "#FFFFFF";
}

export default function EditableNode({ data, selected }: NodeProps) {
  const base = String(data?.color ?? "#60A5FA");
  const fg = readableText(base);

  return (
    <div
      className={[
        "node-glass", // für kleine Hover-Elevation (globals.css)
        "rounded-[22px] px-6 py-4 min-w-[220px] max-w-[420px] select-none",
        "transition-all duration-150 will-change-transform",
        "backdrop-blur-md border",
        selected ? "ring-2 ring-white/70 border-white/30" : "ring-0 border-white/20",
        "hover:shadow-2xl",
      ].join(" ")}
      style={{
        color: fg,
        background:
          // kräftigere Glas-Layer
          `linear-gradient(180deg, ${rgba(base, 0.50)} 0%, ${rgba(base, 0.28)} 100%),` +
          `radial-gradient(120% 140% at 10% 0%, ${rgba("#ffffff", 0.12)} 0%, transparent 60%)`,
        boxShadow: `
          0 14px 32px -8px ${rgba(base, 0.45)},
          inset 0 1px 0 0 rgba(255,255,255,0.25)
        `,
      }}
    >
      <div className="font-semibold text-[22px] leading-tight">
        {data?.label ?? "Knoten"}
      </div>

      {/* Handles – IDs müssen zu pickAutoHandles2 passen */}
      <Handle type="source" id="L-src" position={Position.Left} />
      <Handle type="target" id="L-tgt" position={Position.Left} />
      <Handle type="source" id="R-src" position={Position.Right} />
      <Handle type="target" id="R-tgt" position={Position.Right} />
      <Handle type="source" id="T-src" position={Position.Top} />
      <Handle type="target" id="T-tgt" position={Position.Top} />
      <Handle type="source" id="B-src" position={Position.Bottom} />
      <Handle type="target" id="B-tgt" position={Position.Bottom} />
    </div>
  );
}
