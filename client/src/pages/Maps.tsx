import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, useAuthStore } from '../store'

type MapT = { id:number; name:string; description:string }
export default function Maps(){
  const nav = useNavigate()
  const { setToken, username } = useAuthStore()
  const [maps, setMaps] = React.useState<MapT[]>([])
  const [name, setName] = React.useState('Neue Map')
  const [description, setDesc] = React.useState('')

  const load = async ()=> {
    const { data } = await api.get('/api/maps')
    setMaps(data)
  }
  React.useEffect(()=>{ load() }, [])

  const create = async ()=>{
    const { data } = await api.post('/api/maps', { name, description })
    nav(`/maps/${data.id}`)
  }

  const logout = ()=>{
    setToken(null, null)
    nav('/login')
  }

  return (
    <div style={{maxWidth:900, margin:'40px auto', padding:'0 16px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <h2 style={{margin:0}}>Deine Maps</h2>
        <div>Angemeldet als <b>{username}</b> <button className="btn secondary" onClick={logout}>Logout</button></div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <h3 style={{marginTop:0}}>Neue Map</h3>
        <div style={{display:'grid', gap:8}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name"/>
          <textarea value={description} onChange={e=>setDesc(e.target.value)} placeholder="Beschreibung"></textarea>
          <button className="btn" onClick={create}>Erstellen</button>
        </div>
      </div>
      <div className="card">
        <ul>
          {maps.map(m=>(
            <li key={m.id} style={{margin:'8px 0'}}>
              <Link to={`/maps/${m.id}`}>{m.name}</Link> – <span style={{color:'var(--muted)'}}>{m.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
