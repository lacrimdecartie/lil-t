'use client'
// @ts-nocheck
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  addEdge, MarkerType,
  useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
  ConnectionMode, type Node as RFNode, type Edge as RFEdge,
  type NodeDragHandler, type NodeMouseHandler, type EdgeMouseHandler
} from "reactflow";
import { BackgroundVariant } from "reactflow";
import "reactflow/dist/style.css";

import EditableNode from "@/components/nodes/EditableNode";
import ParallelBezier from "@/components/edges/ParallelBezier";
import ContextMenu, { type MenuItem } from "@/components/ContextMenu";
type AppEdgeData = { label?: string; parallelIndex?: number; parallelCount?: number };
type AppNodeData = { label: string; color: any };

const nodeTypes = { editable: EditableNode };
const edgeTypes = { parallel: ParallelBezier };

/** ---------- Robust pickAutoHandles v2 (kürzeste Seite) ---------- */
function pickAutoHandles2(rf: any, sourceId?: string|null, targetId?: string|null) {
  if (!sourceId || !targetId) return {};
  const s = rf.getNode(String(sourceId));
  const t = rf.getNode(String(targetId));
  if (!s || !t || !s.positionAbsolute || !t.positionAbsolute) return {};

  const SW = Number((s as any).width ?? 180), SH = Number((s as any).height ?? 80);
  const TW = Number((t as any).width ?? 180), TH = Number((t as any).height ?? 80);

  const sCX = s.positionAbsolute.x + SW/2;
  const sCY = s.positionAbsolute.y + SH/2;
  const tCX = t.positionAbsolute.x + TW/2;
  const tCY = t.positionAbsolute.y + TH/2;

  const dx = tCX - sCX;
  const dy = tCY - sCY;
  const H = Math.abs(dx), V = Math.abs(dy);
  const BIAS = 32; // px

  let sKey = "R", tKey = "L";
  if (H >= V + BIAS) {
    sKey = dx >= 0 ? "R" : "L";
    tKey = dx >= 0 ? "L" : "R";
  } else if (V >= H + BIAS) {
    sKey = dy >= 0 ? "B" : "T";
    tKey = dy >= 0 ? "T" : "B";
  } else {
    // diagonal → Quadrantenlogik
    if (dx >= 0 && dy < 0) { sKey = "R"; tKey = "B"; }
    else if (dx >= 0 && dy >= 0) { sKey = "R"; tKey = "T"; }
    else if (dx < 0 && dy < 0) { sKey = "L"; tKey = "B"; }
    else { sKey = "L"; tKey = "T"; }
  }
  return { sourceHandle: `${sKey}-src`, targetHandle: `${tKey}-tgt` };
}

/** ---------- Parallele Kanten-Ranking ---------- */
function rankParallels(eds: RFEdge<AppEdgeData>[]): RFEdge<AppEdgeData>[] {
  // gruppiere nach gerichteter Kante: source->target
  const groups = new Map<string, RFEdge<AppEdgeData>[]>();
  for (const e of eds) {
    const key = `${e.source}->${e.target}`;
    const arr = groups.get(key) ?? []; arr.push(e); groups.set(key, arr);
  }
  const out: RFEdge<AppEdgeData>[] = [];
  for (const [, arr] of groups) {
    const count = arr.length;
    // stabile Reihenfolge (optional nach id)
    arr.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    arr.forEach((e, i) => {
      out.push({
        ...e,
        data: { ...(e.data ?? {}), parallelIndex: i, parallelCount: count },
      } as RFEdge<AppEdgeData>);
    });
  }
  return out;
}

/** ---------- Alle Edge-Handles neu anwenden ---------- */
function __applyAutoHandles(rf:any, list:any[]) {
  return list.map((e:any) => {
    const h = pickAutoHandles2(rf, e.source ?? e.sourceId, e.target ?? e.targetId);
    return {
      ...e,
      source: String(e.source ?? e.sourceId),
      target: String(e.target ?? e.targetId),
      sourceHandle: h.sourceHandle,
      targetHandle: h.targetHandle,
    };
  });
}

/** ---------- Context-Menü State-Typen ---------- */
type Ctx = { open:boolean; x:number; y:number };
type NodeCtx = Ctx & { nodeId?: string };
type EdgeCtx = Ctx & { edgeId?: string };

function Inner() {
  const mapId = "default-map";
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdgeData>([]);
  const rf = useReactFlow();

  // Theme: je nach Uhrzeit (7–19 hell, sonst dunkel)
  useEffect(()=>{
    const h = new Date().getHours();
    const theme = (h>=7 && h<19) ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  },[]);

  // Kontextmenüs
  const [paneCtx, setPaneCtx] = useState<Ctx>({open:false,x:0,y:0});
  const [nodeCtx, setNodeCtx] = useState<NodeCtx>({ open:false,x:0,y:0});
  const [edgeCtx, setEdgeCtx] = useState<EdgeCtx>({open:false,x:0,y:0});

  // Initiale Daten
  useEffect(() => {
    let alive = true;
    (async () => {
      const ns = await fetch(`/api/nodes?mapId=${mapId}`).then(r=>r.json());
      const es = await fetch(`/api/edges?mapId=${mapId}`).then(r=>r.json());
      if (!alive) return;

      setNodes(ns.map((n:any)=>({
        id:String(n.id), type:"editable",
        position:{ x:n.x??0, y:n.y??0 },
        data:{ label:n.label, color:n.color ?? "#60A5FA" }
      })));

      const built = es.map((e:any)=>{
        const h = pickAutoHandles2(rf, e.sourceId, e.targetId);
        return {
          id:String(e.id),
          source:String(e.sourceId),
          target:String(e.targetId),
          sourceHandle:h.sourceHandle,
          targetHandle:h.targetHandle,
          type:"parallel",
          data:{ color: e.color ?? undefined, label: e.label ?? undefined },
          markerEnd:{ type: MarkerType.ArrowClosed }
        };
      });
      setEdges(rankParallels(built as RFEdge<AppEdgeData>[]));
    })();
    return ()=>{ alive=false; };
  }, [mapId, rf, setNodes, setEdges]);

  // Kanten bei RFNode-Änderungen neu ausrichten (kürzeste Seite)
  useEffect(() => {
    setEdges((eds:any[]) => __applyAutoHandles(rf, eds));
  }, [nodes, rf, setEdges]);

  // Verbinden via Drag
// === Persistenter Connect-Handler (POST /api/edges) ===
const onConnectPersist = useCallback(async (params: any) => {
  try {
    const payload = {
      mapId,
      sourceId: String(params.source),
      targetId: String(params.target),
      directed: true
    };
    const edge = await fetch(`/api/edges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json()).catch(() => null);

    const sid = String(edge?.sourceId ?? params.source);
    const tid = String(edge?.targetId ?? params.target);
    const auto = pickAutoHandles2(rf, sid, tid);
    const eid  = String(edge?.id ?? `${sid}->${tid}-${Date.now()}`);

    setEdges((eds: any[]) => rankParallels([
      ...eds,
      {
        id: eid,
        source: sid,
        target: tid,
        sourceHandle: auto.sourceHandle,
        targetHandle: auto.targetHandle,
        type: "parallel",
        data: { ...(edge?.data || {}) },
        markerEnd: { type: MarkerType.ArrowClosed }
      }
    ]));
  } catch (_e) {
    const auto = pickAutoHandles2(rf, String(params.source), String(params.target));
    setEdges((eds:any[]) => rankParallels([
      ...eds,
      {
        id: `${params.source}->${params.target}-${Date.now()}`,
        source: String(params.source),
        target: String(params.target),
        sourceHandle: auto.sourceHandle,
        targetHandle: auto.targetHandle,
        type: "parallel",
        data: {},
        markerEnd: { type: MarkerType.ArrowClosed }
      }
    ]));
  }
}, [mapId, rf, setEdges]);
// === Ende Persistenter Connect-Handler ===
  const onConnect = useCallback((params: any) => {
    const { sourceHandle, targetHandle } = pickAutoHandles2(rf, params.source, params.target);
    setEdges((eds: any[]) => rankParallels(__applyAutoHandles(
      rf,
      addEdge(
        { ...params, sourceHandle, targetHandle, type: "parallel", markerEnd: { type: MarkerType.ArrowClosed } },
        eds
      ) as any
    )));
  }, [rf, setEdges]);

  // Position speichern + auto-handles neu
  const onNodeDragStop: NodeDragHandler = useCallback((_e, node) => {
    fetch(`/api/nodes/${node.id}`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ x: node.position.x, y: node.position.y })
    }).catch(()=>{});
    setEdges((eds:any[]) => __applyAutoHandles(rf, eds));
  }, [rf, setEdges]);

  // Pane: Doppelklick → Knoten an Cursor
  const addNodeHere = useCallback(async (clientX:number, clientY:number)=>{
    const p = rf.screenToFlowPosition({ x: clientX, y: clientY });
    const body = { mapId, label:"Neuer Knoten", x:Math.round(p.x), y:Math.round(p.y), color:"#60A5FA" };
    const node = await fetch(`/api/nodes`,{
      method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body)
    }).then(r=>r.json());
    setNodes((nds: RFNode<AppNodeData>[]) => [...nds,{
      id:String(node.id), type:"editable",
      data:{ label:String(node.label), color: node.color ?? body.color },
      position:{ x: node.x ?? body.x, y: node.y ?? body.y }
    }]);
  },[mapId,setNodes,rf]);

  const onPaneDouble = useCallback((e:any) => {
    if (!e || e.detail !== 2) return;
    addNodeHere(e.clientX, e.clientY);
  }, [addNodeHere]);

  // Kontextmenüs öffnen/schließen
  const onPaneContextMenu = useCallback((e: React.MouseEvent)=>{
    e.preventDefault(); setPaneCtx({open:true,x:e.clientX,y:e.clientY});
  },[]);
  const onNodeContextMenu: NodeMouseHandler = useCallback((e,node)=>{
    e.preventDefault(); e.stopPropagation();
    setNodeCtx({open:true,x:e.clientX,y:e.clientY,nodeId: node.id});
  },[]);
  const onEdgeContextMenu: EdgeMouseHandler = useCallback((e,edge)=>{
    e.preventDefault(); e.stopPropagation();
    setEdgeCtx({open:true,x:e.clientX,y:e.clientY,edgeId: edge.id});
  },[]);
  const closePaneMenu = useCallback(()=> setPaneCtx(s=>({...s,open:false})),[]);
  const closeNodeMenu = useCallback(()=> setNodeCtx(s=>({...s,open:false})),[]);
  const closeEdgeMenu = useCallback(()=> setEdgeCtx(s=>({...s,open:false})),[]);

  // RFNode-Aktionen
  const addNodeFromNode = useCallback(async (fromId:string)=>{
    const from = rf.getNode(fromId);
    const base = from?.positionAbsolute ?? {x:0,y:0};
    const newX = base.x + 240, newY = base.y + 40;
    const node = await fetch(`/api/nodes`,{
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ mapId, label:"Neuer Knoten", x:newX, y:newY, color:"#60A5FA" })
    }).then(r=>r.json());

    setNodes((nds: RFNode<AppNodeData>[]) => [...nds,{
      id:String(node.id), type:"editable",
      data:{ label:String(node.label), color: node.color ?? "#60A5FA" },
      position:{ x:newX, y:newY }
    }]);

    const edge = await fetch(`/api/edges`,{
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ mapId, sourceId: fromId, targetId: node.id, directed: true })
    }).then(r=>r.json());

    const auto = pickAutoHandles2(rf, String(edge.sourceId), String(edge.targetId));
    setEdges((eds: RFEdge<AppEdgeData>[]) => rankParallels([...eds,{
      id:String(edge.id), source:String(edge.sourceId), target:String(edge.targetId),
      sourceHandle:auto.sourceHandle, targetHandle:auto.targetHandle,
      type:"parallel", data:{}, markerEnd:{ type: MarkerType.ArrowClosed }
    }]));
  },[mapId, rf, setNodes, setEdges]);

  const deleteNode = useCallback(async (nodeId:string)=>{
    await fetch(`/api/nodes/${nodeId}`,{ method:"DELETE" }).catch(()=>{});
    setNodes((nds: RFNode<AppNodeData>[]) => nds.filter((n:any)=>n.id!==nodeId));
    setEdges((eds: RFEdge<AppEdgeData>[]) => eds.filter((e:any)=> e.source!==nodeId && e.target!==nodeId ));
  },[setNodes,setEdges]);

  const renameNode = useCallback(async (nodeId:string)=>{
    const current = nodes.find((n:any)=>n.id===nodeId)?.data?.label ?? "";
    const next = window.prompt("Neuer Name:", current);
    if (next==null) return;
    setNodes((nds: RFNode<AppNodeData>[]) => nds.map((n:any)=> n.id===nodeId ? { ...n, data:{...n.data, label: next} } : n));
    await fetch(`/api/nodes/${nodeId}`,{
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ label: next })
    }).catch(()=>{});
  },[nodes,setNodes]);

  const colorNode = useCallback(async (nodeId:string, hex:string)=>{
    setNodes((nds: RFNode<AppNodeData>[]) => nds.map((n:any)=> n.id===nodeId ? { ...n, data:{...n.data, color: hex} } : n));
    await fetch(`/api/nodes/${nodeId}`,{
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ color: hex })
    }).catch(()=>{});
  },[setNodes]);

  // Edge-Aktionen
  const deleteEdge = useCallback(async (edgeId:string)=>{
    await fetch(`/api/edges/${edgeId}`,{ method:"DELETE" }).catch(()=>{});
    setEdges((eds: RFEdge<AppEdgeData>[]) => eds.filter((e:any)=> e.id!==edgeId));
  },[setEdges]);

  const labelEdge = useCallback(async (edgeId:string)=>{
    const current = edges.find((e:any)=>e.id===edgeId)?.data?.label ?? "";
    const next = window.prompt("Relation-Text:", current);
    if (next==null) return;
    setEdges((eds: RFEdge<AppEdgeData>[]) => eds.map((e:any)=> e.id===edgeId ? { ...e, data:{ ...(e.data||{}), label: next } } : e));
    await fetch(`/api/edges/${edgeId}`,{
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ label: next })
    }).catch(()=>{});
  },[edges,setEdges]);

  const colorEdge = useCallback(async (edgeId:string, hex:string)=>{
    setEdges((eds: RFEdge<AppEdgeData>[]) => rankParallels(eds.map((e:any)=> e.id===edgeId ? { ...e, data:{ ...(e.data||{}), color: hex } } : e)));
    await fetch(`/api/edges/${edgeId}`,{
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ color: hex })
    }).catch(()=>{});
  },[setEdges]);

  // Menü-Items
  const paneItems: MenuItem[] = useMemo(()=>[
    { type:"action", label:"Knoten erstellen", onClick: ()=> addNodeHere(paneCtx.x, paneCtx.y) },
  ],[paneCtx, addNodeHere]);

  const nodeItems = useMemo<MenuItem[]>(()=>[
    { type:"action", label:"Knoten löschen", onClick: ()=> nodeCtx.nodeId && deleteNode(nodeCtx.nodeId) },
    { type:"action", label:"Knoten hinzufügen (mit Relation)", onClick: ()=> nodeCtx.nodeId && addNodeFromNode(nodeCtx.nodeId) },
    { type:"action", label:"Umbenennen", onClick: ()=> nodeCtx.nodeId && renameNode(nodeCtx.nodeId) },
    { type:"color",  label:"Farbe", onChange:(hex)=> nodeCtx.nodeId && colorNode(nodeCtx.nodeId, hex) },
  ],[nodeCtx, deleteNode, addNodeFromNode, renameNode, colorNode]);

  const edgeItems = useMemo<MenuItem[]>(()=>[
    { type:"action", label:"Relation löschen", onClick: ()=> edgeCtx.edgeId && deleteEdge(edgeCtx.edgeId) },
    { type:"action", label:"Text",             onClick: ()=> edgeCtx.edgeId && labelEdge(edgeCtx.edgeId) },
    { type:"color",  label:"Farbe",            onChange:(hex)=> edgeCtx.edgeId && colorEdge(edgeCtx.edgeId, hex) },
  ],[edgeCtx, deleteEdge, labelEdge, colorEdge]);

  return (
    <div className="w-full h-[calc(100vh-64px)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnectPersist}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: "parallel", markerEnd: { type: MarkerType.ArrowClosed } }}
        fitView
        onPaneClick={onPaneDouble}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1.6} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>

      {/* Kontext-Menüs */}
      <ContextMenu open={paneCtx.open} x={paneCtx.x} y={paneCtx.y} onClose={closePaneMenu} items={paneItems} />
      <ContextMenu open={nodeCtx.open} x={nodeCtx.x} y={nodeCtx.y} onClose={closeNodeMenu} items={nodeItems} />
      <ContextMenu open={edgeCtx.open} x={edgeCtx.x} y={edgeCtx.y} onClose={closeEdgeMenu} items={edgeItems} />
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
