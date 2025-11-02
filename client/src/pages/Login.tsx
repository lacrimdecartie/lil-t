import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, api } from '../store'

export default function Login(){
  const nav = useNavigate()
  const { setToken } = useAuthStore()
  const [username, setU] = React.useState('admin')
  const [password, setP] = React.useState('admin')
  const [err, setErr] = React.useState<string|null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/api/auth/login', { username, password })
      setToken(data.token, data.username)
      nav('/')
    } catch (e:any){
      setErr(e?.response?.data?.error || 'Login fehlgeschlagen')
    }
  }

  const toggleTheme = ()=>{
    const cur = document.documentElement.getAttribute('data-theme') || 'dark'
    const next = cur === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <div style={{display:'grid', placeItems:'center', height:'100%'}}>
      <div className="card" style={{width:360}}>
        <h2 style={{marginTop:0}}>Anmelden</h2>
        <form onSubmit={submit} style={{display:'grid', gap:8}}>
          <label>Benutzername
            <input value={username} onChange={e=>setU(e.target.value)} placeholder="admin"/>
          </label>
          <label>Passwort
            <input type="password" value={password} onChange={e=>setP(e.target.value)} placeholder="admin"/>
          </label>
          {err && <div style={{color:'#ff6b6b'}}>{err}</div>}
          <button className="btn" type="submit">Login</button>
          <button className="btn secondary" onClick={toggleTheme} type="button">Theme wechseln</button>
        </form>
      </div>
    </div>
  )
}
