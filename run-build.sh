#!/bin/bash
set -euo pipefail

APP_BASE="/mnt/user/appdata/lil-t"
DATA_DIR="$APP_BASE/data"
cd "$APP_BASE"

echo "=== $(date) | lil-t Build/Start beginnt ==="
echo "Arbeitsverzeichnis: $APP_BASE"

# 1) Next-Config korrigieren (kein experimental.appDir nötig)
cat > "$APP_BASE/next.config.mjs" <<'EONC'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
export default nextConfig;
EONC

# 2) Editor.tsx mit korrekten React-Flow-Typen
cat > "$APP_BASE/components/Editor.tsx" <<'EOTSX'
"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  MarkerType,
  Connection,
  type Node as RFNode,
  type Edge as RFEdge,
} from "reactflow";
import "reactflow/dist/style.css";

type NodeData = { label: string };

const defaultMapId = "default-map";

export default function Editor() {
  const [mapId] = useState<string>(defaultMapId);
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge[]>([]);

  const load = useCallback(async () => {
    const [n, e] = await Promise.all([
      fetch(`/api/nodes?mapId=${mapId}`).then((r) => r.json()),
      fetch(`/api/edges?mapId=${mapId}`).then((r) => r.json()),
    ]);

    const mappedNodes: RFNode<NodeData>[] = n.map((x: any) => ({
      id: x.id,
      data: { label: x.label as string },
      position: { x: x.x ?? 0, y: x.y ?? 0 },
      style: x.color
        ? { backgroundColor: x.color as string, borderRadius: 12, padding: 8 }
        : { borderRadius: 12, padding: 8 },
    }));

    const mappedEdges: RFEdge[] = e.map((x: any) => ({
      id: x.id,
      source: x.sourceId,
      target: x.targetId,
      label: x.label ?? undefined,
      type: "default",
      markerEnd: x.directed ? { type: MarkerType.ArrowClosed } : undefined,
      style: x.color ? { stroke: x.color } : undefined,
    }));

    setNodes(mappedNodes);
    setEdges(mappedEdges);
  }, [mapId, setNodes, setEdges]);

  useEffect(() => { load(); }, [load]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    fetch(`/api/edges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapId,
        sourceId: connection.source,
        targetId: connection.target,
        directed: true,
      }),
    })
      .then((r) => r.json())
      .then((edge) => {
        setEdges((eds) =>
          addEdge(
            {
              id: edge.id,
              source: edge.sourceId,
              target: edge.targetId,
              markerEnd: { type: MarkerType.ArrowClosed },
            },
            eds
          )
        );
      });
  }, [mapId, setEdges]);

  const addNode = useCallback(async () => {
    const label = prompt("Titel des Knotens?")?.trim();
    if (!label) return;
    const color = prompt("Farbe (z.B. #EAB308 für gelb)?")?.trim() || undefined;

    const node = await fetch(`/api/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapId, label, x: Math.random() * 400, y: Math.random() * 200, color }),
    }).then((r) => r.json());

    const newNode: RFNode<NodeData> = {
      id: node.id,
      data: { label: node.label as string },
      position: { x: node.x ?? 0, y: node.y ?? 0 },
      style: node.color
        ? { backgroundColor: node.color as string, borderRadius: 12, padding: 8 }
        : { borderRadius: 12, padding: 8 },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [mapId, setNodes]);

  const nodeTypes = useMemo(() => ({}), []);

  return (
    <div className="h-[calc(100vh-56px)] w-full">
      <div className="flex items-center gap-2 p-2 border-b">
        <button onClick={addNode} className="px-3 py-1 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-900">+ Knoten</button>
        <button onClick={load} className="px-3 py-1 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-900">↻ Aktualisieren</button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap pannable zoomable />
        <Controls />
        <Background variant="dots" gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
EOTSX

# 3) Berechtigungen (Unraid-Standard)
echo "→ Setze Berechtigungen ..."
mkdir -p "$DATA_DIR"
chown -R nobody:users "$APP_BASE" "$DATA_DIR"
find "$APP_BASE" -type d -exec chmod 775 {} \;
find "$APP_BASE" -type f -exec chmod 664 {} \;
chmod 775 "$DATA_DIR"

# 4) Build + Start
echo "→ docker compose build ..."
docker compose build --progress=plain

echo "→ docker compose up -d ..."
docker compose up -d

echo "→ Status:"
docker compose ps
echo "→ Logs (letzte 60 Zeilen):"
docker logs --tail=60 lil-t || true

echo "=== $(date) | lil-t Build/Start fertig ==="
