import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactFlow, {
  Controls, MiniMap, Background,
  Connection, Edge, Node, ReactFlowProvider,
  OnConnect, useNodesState, useEdgesState, useReactFlow, NodeProps, Handle, Position,
  BaseEdge, EdgeLabelRenderer, getBezierPath, MarkerType, EdgeMarker
} from 'reactflow'
import 'reactflow/dist/style.css'
import { api } from '../store'

type NodeDB = { id:number; label:string; x:number; y:number; description?:string; image_path?:string }
type EdgeDB = { id:number; source:number; target:number; label?:string; directed?:number }
type MapResp = { map:{id:number; name:string; description:string}, nodes:NodeDB[], edges:EdgeDB[] }

type CtxState =
  | { open:false }
  | { open:true; type:'pane'; x:number; y:number; flowX:number; flowY:number }
  | { open:true; type:'node'; x:number; y:number; nodeId:string }
  | { open:true; type:'edge'; x:number; y:number; edgeId:string }

function useOutsideClose(ref: React.RefObject<HTMLDivElement>, onClose: ()=>void){
  React.useEffect(()=>{
    function onDoc(e:MouseEvent){ if (!ref.current) return; if (!ref.current.contains(e.target as Node)) onClose() }
    function onEsc(e:KeyboardEvent){ if(e.key==='Escape') onClose() }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onEsc)
    return ()=>{ document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  },[ref,onClose])
}

function Menu({state, close, actions}:{state:CtxState, close:()=>void, actions:Record<string, ()=>void>}){
  const ref = React.useRef<HTMLDivElement>(null)
  useOutsideClose(ref, close)
  if (!state.open) return null
  const style: React.CSSProperties = { position:'fixed', left: state.x, top: state.y, zIndex: 10000, background:'var(--card)', color:'var(--fg)', border:'1px solid #2a3357', borderRadius:12, minWidth:220, boxShadow:'0 10px 30px rgba(0,0,0,.35)' }
  const Row = ({label, onClick}:{label:string; onClick:()=>void}) => (
    <div onClick={()=>{ onClick(); close(); }} style={{padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #1c2547', display:'flex', gap:10, alignItems:'center'}} onMouseDown={e=>e.preventDefault()}>
      <span>{label.split(' ')[0]}</span><span>{label.split(' ').slice(1).join(' ')}</span>
    </div>
  )
  const items:string[] = []
  if (state.type==='pane'){ items.push('➕ Knoten hier') }
  if (state.type==='node'){ items.push('✏️ Umbenennen','📝 Beschreibung','🖼️ Bild','🗑️ Löschen') }
  if (state.type==='edge'){ items.push('🔁 Richtung umkehren','🏷️ Label','🗑️ Löschen') }
  return (<div ref={ref} style={style}>{items.map(k => <Row key={k} label={k} onClick={actions[k]} />)}</div>)
}

/** ---- Node Renderer (keine sichtbaren Punkte) ---- */
const hiddenHandle: React.CSSProperties = { opacity:0, width:20, height:20 }
function NodeCard(props: NodeProps){
  const { data } = props as any
  return (
    <div title={data?.desc || ''} style={{ background:'var(--card)', color:'var(--fg)', borderRadius:24, padding:16, minWidth:220, boxShadow:'0 10px 30px rgba(0,0,0,.25)', border:'2px solid #2a3357', textAlign:'center', position:'relative' }}>
      {data?.img ? (<div style={{marginBottom:8, display:'grid', placeItems:'center'}}><img src={data.img} alt="" style={{maxWidth:260, maxHeight:120, borderRadius:12, objectFit:'cover'}} /></div>) : null}
      <div style={{fontSize:28, fontWeight:800, lineHeight:1.1}}>{data?.label || 'Knoten'}</div>
      {/* Nur 1 Source + 1 Target, unsichtbar; RF braucht je einen, Position egal */}
      <Handle id="out" type="source" position={Position.Right} style={hiddenHandle} />
      <Handle id="in"  type="target" position={Position.Left}  style={hiddenHandle} />
    </div>
  )
}
const nodeTypes = { card: NodeCard }

/** ---- Custom Edge Renderer (gerichtet + parallel versetzt) ---- */
function DirectedEdge(props: any){
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerStart, markerEnd } = props
  const pi = Number(props?.data?.pi || 0)
  const sign = pi % 2 === 0 ? 1 : -1
  const bump = Math.floor(pi/1) * 0.12
  const curvature = 0.25 + bump
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, curvature: curvature * sign })
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerStart={markerStart as EdgeMarker} markerEnd={markerEnd as EdgeMarker} style={{ strokeWidth: 2 }} />
      {props.label ? (<EdgeLabelRenderer><div style={{ position:'absolute', transform:`translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents:'all', background:'var(--card)', color:'var(--fg)', border:'1px solid #2a3357', borderRadius:6, padding:'2px 6px', fontSize:12 }}>{props.label}</div></EdgeLabelRenderer>) : null}
    </>
  )
}
const edgeTypes = { dir: DirectedEdge }

/** ---- Utilities ---- */
function assignParallelIndex<T extends Edge>(edges: T[]): T[] {
  const groups = new Map<string, T[]>()
  edges.forEach((e:any)=>{ const key = [e.source, e.target].slice().sort().join('-'); const arr = groups.get(key) || []; arr.push(e); groups.set(key, arr) })
  groups.forEach(list=>{ list.sort((a:any,b:any)=> String(a.id).localeCompare(String(b.id))); list.forEach((e:any, idx:number)=>{ e.data = { ...(e.data||{}), pi: idx } }) })
  return edges
}
function markerForward(): EdgeMarker { return { type: MarkerType.ArrowClosed, width: 18, height: 18 } }
function markerBackward(): EdgeMarker { return { type: MarkerType.ArrowClosed, width: 18, height: 18 } }

/** Bestimme Seiten (Left/Right/Top/Bottom) abhängig von Node-Zentren */
function computeSides(src: Node, tgt: Node){
  const sx = src.position.x + (src?.width || 0)/2
  const sy = src.position.y + (src?.height || 0)/2
  const tx = tgt.position.x + (tgt?.width || 0)/2
  const ty = tgt.position.y + (tgt?.height || 0)/2
  const dx = tx - sx, dy = ty - sy
  if (Math.abs(dx) >= Math.abs(dy)) {
    // horizontal bevorzugt
    return {
      sourcePosition: dx >= 0 ? Position.Right : Position.Left,
      targetPosition: dx >= 0 ? Position.Left  : Position.Right
    }
  } else {
    // vertikal bevorzugt
    return {
      sourcePosition: dy >= 0 ? Position.Bottom : Position.Top,
      targetPosition: dy >= 0 ? Position.Top    : Position.Bottom
    }
  }
}

/** Setze source/target Positions + Pfeilmarker anhand Geometrie/Richtung */
function materializeEdge(e: any, nodes: Node[]){
  const byId = new Map(nodes.map(n=>[n.id, n]))
  const s = byId.get(e.source), t = byId.get(e.target)
  if (s && t) {
    const sides = computeSides(s, t)
    e.sourcePosition = sides.sourcePosition
    e.targetPosition = sides.targetPosition
  }
  const directed = !!(e.data?.directed)
  const rev = !!(e.data?.rev)
  e.markerStart = directed && rev ? markerBackward() : undefined
  e.markerEnd   = directed && !rev ? markerForward() : undefined
  return e
}

function materializeAllEdges(edges: Edge[], nodes: Node[]){
  return assignParallelIndex(edges.map(e => materializeEdge({ ...e }, nodes)))
}

/** ---- Canvas ---- */
function CanvasInner(){
  const { id } = useParams()
  const nav = useNavigate()
  const rf = useReactFlow()
  const [map, setMap] = React.useState<MapResp['map']|null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [ctx, setCtx] = React.useState<CtxState>({ open:false })

  const load = async ()=>{
    const { data } = await api.get(`/api/maps/${id}`)
    setMap(data.map)
    const ns: Node[] = data.nodes.map((n:NodeDB)=>({ id:String(n.id), type:'card', position:{x:n.x, y:n.y}, data:{ label:n.label, desc:n.description||'', img:n.image_path||'' } }))
    setNodes(ns)
    const es: Edge[] = data.edges.map((e:EdgeDB)=>({
      id: String(e.id),
      type: 'dir',
      source: String(e.source),
      target: String(e.target),
      label: e.label || '',
      data: { directed: !!e.directed, rev:false }
    }) as any)
    setEdges(materializeAllEdges(es, ns))
  }
  React.useEffect(()=>{ load() }, [id])

  // Wenn Nodes/Edges sich ändern (z.B. Drag), Seiten für ALLE Kanten neu berechnen
  React.useEffect(()=>{
    setEdges(prev => materializeAllEdges(prev as any, nodes))
  }, [nodes])

  const onConnect: OnConnect = async (params: Connection) => {
    if (!params.source || !params.target) return
    const { data } = await api.post(`/api/maps/${id}/edges`, { source: Number(params.source), target: Number(params.target), label:'', directed: true })
    const newEdge: any = { id:String(data.id), type:'dir', source:String(data.source), target:String(data.target), label:data.label, data:{ directed:true, rev:false } }
    setEdges(prev => materializeAllEdges(prev.concat(newEdge) as any, nodes))
  }

  const onPaneDoubleClick = async (evt: React.MouseEvent) => {
    const p = rf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY })
    const { data } = await api.post(`/api/maps/${id}/nodes`, { label:'Neuer Knoten', x: p.x, y: p.y })
    setNodes((nds)=>nds.concat({ id:String(data.id), type:'card', position:{x:data.x, y:data.y}, data:{ label:data.label, desc:'', img:'' } }))
  }

  /** Kontext-Menüs */
  const onPaneContextMenu = (evt: React.MouseEvent)=>{
    evt.preventDefault()
    const flow = rf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY })
    setCtx({ open:true, type:'pane', x: evt.clientX, y: evt.clientY, flowX: flow.x, flowY: flow.y })
  }
  const onNodeContextMenu = (evt:any, node:Node)=>{
    evt.preventDefault()
    setCtx({ open:true, type:'node', x: evt.clientX, y: evt.clientY, nodeId: node.id })
  }
  const onEdgeContextMenu = (evt:any, edge:Edge)=>{
    evt.preventDefault()
    setCtx({ open:true, type:'edge', x: evt.clientX, y: evt.clientY, edgeId: edge.id })
  }

  const actions: Record<string, ()=>void> = {
    '➕ Knoten hier': async ()=>{
      if (!(ctx.open && ctx.type==='pane')) return
      const { data } = await api.post(`/api/maps/${id}/nodes`, { label:'Neuer Knoten', x: ctx.flowX, y: ctx.flowY })
      setNodes((nds)=>nds.concat({ id:String(data.id), type:'card', position:{x:data.x, y:data.y}, data:{ label:data.label, desc:'', img:'' } }))
    },
    '✏️ Umbenennen': async ()=>{
      if (!(ctx.open && ctx.type==='node')) return
      const n = nodes.find(n=>n.id===ctx.nodeId); if(!n) return
      const label = prompt('Neuer Name', String((n.data as any).label||'Knoten')) || (n.data as any).label
      setNodes(nds=>nds.map(x=>x.id===n.id?{...x, data:{...(x.data as any), label}}:x))
      await api.put(`/api/maps/${id}/nodes/${n.id}`, { label })
    },
    '📝 Beschreibung': async ()=>{
      if (!(ctx.open && ctx.type==='node')) return
      const n = nodes.find(n=>n.id===ctx.nodeId); if(!n) return
      const desc = prompt('Beschreibung (Markdown – wird als Tooltip angezeigt)', String((n.data as any).desc||'')) ?? (n.data as any).desc
      setNodes(nds=>nds.map(x=>x.id===n.id?{...x, data:{...(x.data as any), desc}}:x))
      await api.put(`/api/maps/${id}/nodes/${n.id}`, { description: desc })
    },
    '🖼️ Bild': async ()=>{
      if (!(ctx.open && ctx.type==='node')) return
      const n = nodes.find(n=>n.id===ctx.nodeId); if(!n) return
      const url = prompt('Bild-URL (leer = entfernen)', (n.data as any).img||'') || ''
      setNodes(nds=>nds.map(x=>x.id===n.id?{...x, data:{...(x.data as any), img:url}}:x))
      await api.put(`/api/maps/${id}/nodes/${n.id}`, { image_path: url })
    },
    '🗑️ Löschen': async ()=>{
      if (ctx.open && ctx.type==='node'){
        await api.delete(`/api/maps/${id}/nodes/${ctx.nodeId}`)
        setNodes(nds=>nds.filter(n=>n.id!==ctx.nodeId))
      } else if (ctx.open && ctx.type==='edge'){
        await api.delete(`/api/maps/${id}/edges/${ctx.edgeId}`)
        setEdges(eds=>eds.filter(e=>e.id!==ctx.edgeId))
      }
    },
    '🔁 Richtung umkehren': async ()=>{
      if (!(ctx.open && ctx.type==='edge')) return
      const e = edges.find(e=>e.id===ctx.edgeId); if(!e) return
      const curDirected = !!(e.data as any)?.directed
      const curRev = !!(e.data as any)?.rev
      let nextDirected = curDirected, nextRev = curRev
      if (!curDirected){ nextDirected = true; nextRev = false }
      else if (curDirected && !curRev){ nextDirected = true; nextRev = true }
      else { nextDirected = false; nextRev = false }

      setEdges(prev => materializeAllEdges(prev.map(x=>x.id===e.id?{
        ...x,
        data:{ ...(x.data as any), directed: nextDirected, rev: nextRev }
      }:x) as any, nodes))

      try{
        await api.put(`/api/maps/${id}/edges/${e.id}`, { directed: nextDirected ? 1 : 0 })
        if (nextDirected && curDirected){
          const newSource = Number((e as any).target)
          const newTarget = Number((e as any).source)
          await api.put(`/api/maps/${id}/edges/${e.id}`, { source: newSource, target: newTarget })
        }
      }catch(_err){}
    },
    '🏷️ Label': async ()=>{
      if (!(ctx.open && ctx.type==='edge')) return
      const e = edges.find(e=>e.id===ctx.edgeId); if(!e) return
      const label = prompt('Edge-Label', String(e.label||'')) ?? e.label
      setEdges(prev => materializeAllEdges(prev.map(x=>x.id===e.id?{...x, label}:x) as any, nodes))
      await api.put(`/api/maps/${id}/edges/${e.id}`, { label })
    }
  }

  const onNodeDragStop = async (_:any, node:Node)=>{
    await api.put(`/api/maps/${id}/nodes/${node.id}`, { x: node.position.x, y: node.position.y })
    // edges werden via useEffect([nodes]) re-materialized
  }

  const themeToggle = ()=>{
    const cur = document.documentElement.getAttribute('data-theme') || 'dark'
    const next = cur === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }
  const exportCSV = ()=>{ window.location.href = `/api/maps/${id}/csv/export` }
  const importCSV = async (e:React.ChangeEvent<HTMLInputElement>)=>{
    const f = e.target.files?.[0]; if (!f) return
    const text = await f.text()
    await fetch(`/api/maps/${id}/csv/import`, { method:'POST', headers:{ 'Authorization':'Bearer '+(localStorage.getItem('token')||''), 'Content-Type':'text/plain' }, body: text })
    await load()
  }
  const share = async ()=>{
    const { token } = await (await fetch(`/api/maps/${id}/share`, { method:'POST', headers:{ 'Authorization':'Bearer '+(localStorage.getItem('token')||''), 'Content-Type':'application/json' }, body: JSON.stringify({}) })).json()
    alert(`${location.origin}/share/${token}`)
  }

  const closeCtx = ()=> setCtx({ open:false })

  return (
    <div style={{height:'100vh', display:'grid', gridTemplateRows:'56px 1fr'}}>
      <div style={{display:'flex', gap:8, alignItems:'center', padding:'8px 12px', borderBottom:'1px solid #2a3357'}}>
        <button className="btn secondary" onClick={()=>nav('/')}>← Maps</button>
        <div style={{fontWeight:700}}>{map?.name}</div>
        <div style={{flex:1}}></div>
        <button className="btn secondary" onClick={themeToggle}>Theme</button>
        <button className="btn secondary" onClick={exportCSV}>CSV Export</button>
        <label className="btn secondary" style={{display:'inline-block', cursor:'pointer'}}>CSV Import<input type="file" accept=".csv,text/csv" onChange={importCSV} style={{display:'none'}}/></label>
        <button className="btn secondary" onClick={share}>Share-Link</button>
      </div>
      <div style={{height:'100%'}} onContextMenu={(e)=>e.preventDefault()}>
        <ReactFlow
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodes={nodes}
          edges={edges}
          onNodesChange={(c)=>{ closeCtx(); onNodesChange(c) }}
          onEdgesChange={(c)=>{ closeCtx(); onEdgesChange(c) }}
          onConnect={onConnect}
          onPaneDoubleClick={onPaneDoubleClick}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onNodeDragStart={closeCtx}
          onMoveStart={closeCtx}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={(_, node)=>{
            const label = prompt('Neuer Name', String((node.data as any).label||'Knoten')) || (node.data as any).label
            setNodes(nds=>nds.map(x=>x.id===node.id?{...x, data:{...(x.data as any), label}}:x))
            api.put(`/api/maps/${id}/nodes/${node.id}`, { label })
          }}
          allowMultiEdges={true}
          connectionMode="loose"
          zoomOnDoubleClick={false}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background variant="dots" />
        </ReactFlow>
        <Menu state={ctx} close={closeCtx} actions={actions}/>
      </div>
    </div>
  )
}

export default function Canvas(){ return (<ReactFlowProvider><CanvasInner/></ReactFlowProvider>) }
