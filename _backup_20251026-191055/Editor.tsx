// @ts-nocheck
"use client";

import React, { useCallback, useEffect } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  addEdge, MarkerType,
  useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
  ConnectionMode
} from "reactflow";
import "reactflow/dist/style.css";

import EditableNode from "@/components/nodes/EditableNode";
import { pickAutoHandles } from "@/lib/autoHandles";

const nodeTypes = { editable: EditableNode };

function Inner() {
  const mapId = "default-map";
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const rf = useReactFlow();

  // Initiale Daten laden
  useEffect(() => {
    (async () => {
      const ns = await fetch(`/api/nodes?mapId=${mapId}`).then(r=>r.json());
      const es = await fetch(`/api/edges?mapId=${mapId}`).then(r=>r.json());
      setNodes(ns.map((n:any) => ({
        id: String(n.id),
        type: "editable",
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        data: { label: n.label, color: n.color ?? "#FBBF24" }
      })));
      setEdges(es.map((e:any) => ({
        id: String(e.id),
        source: String(e.sourceId),
        target: String(e.targetId),
        type: "bezier",
        markerEnd: { type: MarkerType.ArrowClosed }
      })));
    })();
  }, [mapId, setNodes, setEdges]);

  // Verbinden durch Ziehen + automatisch beste Seiten
  const onConnect = useCallback((params:any) => {
    const { sourceHandle, targetHandle } = pickAutoHandles(rf, params.source, params.target);
    setEdges((eds) =>
      addEdge(
        { ...params, sourceHandle, targetHandle, type: "bezier", markerEnd: { type: MarkerType.ArrowClosed } },
        eds
      )
    );

    // Server-Edge erstellen (ohne auf Antwort zu warten; optional könntest du danach updaten)
    fetch(`/api/edges`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ mapId, sourceId: params.source, targetId: params.target, directed: true })
    }).catch(()=>{});
  }, [rf, setEdges, mapId]);

  // Drag-Ende → Position speichern
  const onNodeDragStop = useCallback(async (_e:any, node:any) => {
    try {
      await fetch(`/api/nodes/${node.id}`, {
        method:"PATCH",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ x: node.position.x, y: node.position.y })
      });
    } catch {}
  }, []);

  return (
    <div className="w-full h-[calc(100vh-80px)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: "bezier", markerEnd: { type: MarkerType.ArrowClosed } }}
        fitView
      >
        <MiniMap pannable zoomable />
        <Controls />
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <Inner />
    </ReactFlowProvider>
  );
}
