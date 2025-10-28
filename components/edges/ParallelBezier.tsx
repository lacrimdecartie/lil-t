// @ts-nocheck
"use client";

import React from "react";
import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps } from "reactflow";

// Mini-Hash als Fallback, falls kein parIndex geliefert wurde
function h(str: string): number {
  let x = 0;
  for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(x);
}

export default function ParallelBezier(props: EdgeProps) {
  const {
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, markerEnd, style, data, label,
  } = props;

  // Parallel-Index (aus rankParallels), sonst Fallback
  const step = Number((data && data.parIndex) ?? 0);
  const fallback = ((h(String(id)) % 5) - 2) || 1; // -2..+2 (ohne 0)
  const k = step !== 0 ? step : fallback * 0.5;

  // Distanz-adaptive Grundkrümmung
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const dist = Math.hypot(dx, dy);

  // Basis + Parallelabstand
  const base = Math.min(0.36, 0.18 + (dist / 600) * 0.16);
  const spacing = 0.08;
  const curvature = base + k * spacing;

  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature,
  });

  const edgeLabel = (data && data.label) ?? label ?? "";
  const stroke = (data && data.color) || (style && style.stroke) || "#A3AED0";

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{ ...(style || {}), stroke, strokeWidth: 3, opacity: 0.92 }}
      />
      {edgeLabel ? (
        <EdgeLabelRenderer>
          <div
            className="px-3 py-1 rounded-full text-[14px] font-medium shadow-md"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: "rgba(15,18,28,0.66)",
              color: "#E8EEFF",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              pointerEvents: "all",
              userSelect: "none",
            }}
          >
            {edgeLabel}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
