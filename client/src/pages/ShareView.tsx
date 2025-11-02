import React from 'react'
import { useParams } from 'react-router-dom'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'

export default function ShareView(){
  const { token } = useParams()
  const [title, setTitle] = React.useState('Shared View')
  const [nodes, setNodes] = React.useState<any[]>([])
  const [edges, setEdges] = React.useState<any[]>([])

  React.useEffect(()=>{
    (async ()=>{
      const res = await fetch(`/share/${token}`)
      const j = await res.json()
      setTitle(j?.map?.name || 'Shared View')
      setNodes((j.nodes||[]).map((n:any)=>({ id:String(n.id), data:{ label:n.label }, position:{x:n.x, y:n.y} })))
      setEdges((j.edges||[]).map((e:any)=>({ id:String(e.id), source:String(e.source), target:String(e.target), label:e.label })))
    })()
  }, [token])

  return (
    <div style={{height:'100vh', display:'grid', gridTemplateRows:'56px 1fr'}}>
      <div style={{display:'flex', alignItems:'center', padding:'8px 12px', borderBottom:'1px solid #2a3357'}}>
        <b>{title}</b> <span style={{marginLeft:8, opacity:.7}}>(read-only)</span>
      </div>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <MiniMap/>
        <Controls/>
        <Background variant="dots"/>
      </ReactFlow>
    </div>
  )
}
