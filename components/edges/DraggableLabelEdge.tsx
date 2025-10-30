'use client'
// @ts-nocheck
"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "reactflow";

type EdgeData = { label?: string; color?: string; labelX?: number; labelY?: number };

export default function DraggableLabelEdge(props: EdgeProps<EdgeData>) {
  const { id, sourceX, sourceY, targetX, targetY, data, markerEnd } = props;
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState<{x:number;y:number}>({ x: data?.labelX ?? 0, y: data?.labelY ?? 0 });
  const labelRef = useRef<HTMLDivElement>(null);

  const [edgePath, labelX, labelY] = useMemo(
    () => getBezierPath({ sourceX, sourceY, targetX, targetY }),
    [sourceX, sourceY, targetX, targetY]
  );

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(true);
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    e.stopPropagation();
    setOffset((o) => ({ x: o.x + e.movementX, y: o.y + e.movementY }));
  }, [dragging]);
  const onMouseUp = useCallback(async () => {
    if (!dragging) return;
    setDragging(false);
    try {
      await fetch(`/api/edges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelX: offset.x, labelY: offset.y }),
      });
    } catch {}
  }, [dragging, id, offset]);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ stroke: data?.color || undefined }} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            ref={labelRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX + (offset.x||0)}px, ${labelY + (offset.y||0)}px)`,
              pointerEvents: 'all',
              userSelect: 'none',
            }}
            className="px-2 py-1 text-xs rounded bg-white/90 border shadow-sm cursor-move"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
