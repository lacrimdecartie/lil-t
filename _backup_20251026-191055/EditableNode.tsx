// @ts-nocheck
"use client";

import React from "react";
import { Handle, Position, NodeProps } from "reactflow";

type Data = { label: string; color?: string; small?: boolean };

const STRIP = 14; // Dicke der unsichtbaren Drag-Zone
const OUT   = -1; // 1px nach außen: Linie startet exakt am Rand

const strip: React.CSSProperties = {
  background: "transparent",
  border: "none",
  opacity: 0,
  pointerEvents: "auto",
  position: "absolute",
  zIndex: 3,
};

export default function EditableNode({ data }: NodeProps<Data>) {
  const color = data?.color ?? "#FBBF24";
  const small = !!data?.small;

  return (
    <div
      className={`relative select-none rounded-2xl border shadow-sm ${small ? "px-4 py-2 text-[15px]" : "px-6 py-4 text-[18px]"}`}
      style={{ background: color, borderColor: "rgba(17,24,39,0.12)" }}
    >
      <div className="font-medium">{data?.label ?? "Knoten"}</div>

      {/* Links */}
      <Handle id="L-tgt" type="target" position={Position.Left}
        style={{ ...strip, left: OUT, top: `calc(50% - ${STRIP/2}px)`, width: STRIP, height: STRIP*3 }} />
      <Handle id="L-src" type="source" position={Position.Left}
        style={{ ...strip, left: OUT, top: `calc(50% - ${STRIP/2}px)`, width: STRIP, height: STRIP*3 }} />

      {/* Rechts */}
      <Handle id="R-tgt" type="target" position={Position.Right}
        style={{ ...strip, right: OUT, top: `calc(50% - ${STRIP/2}px)`, width: STRIP, height: STRIP*3 }} />
      <Handle id="R-src" type="source" position={Position.Right}
        style={{ ...strip, right: OUT, top: `calc(50% - ${STRIP/2}px)`, width: STRIP, height: STRIP*3 }} />

      {/* Oben */}
      <Handle id="T-tgt" type="target" position={Position.Top}
        style={{ ...strip, top: OUT, left: `calc(50% - ${STRIP}px)`, width: STRIP*3, height: STRIP }} />
      <Handle id="T-src" type="source" position={Position.Top}
        style={{ ...strip, top: OUT, left: `calc(50% - ${STRIP}px)`, width: STRIP*3, height: STRIP }} />

      {/* Unten */}
      <Handle id="B-tgt" type="target" position={Position.Bottom}
        style={{ ...strip, bottom: OUT, left: `calc(50% - ${STRIP}px)`, width: STRIP*3, height: STRIP }} />
      <Handle id="B-src" type="source" position={Position.Bottom}
        style={{ ...strip, bottom: OUT, left: `calc(50% - ${STRIP}px)`, width: STRIP*3, height: STRIP }} />
    </div>
  );
}
