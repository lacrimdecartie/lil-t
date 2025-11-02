import { create } from 'zustand'
import axios from 'axios'

type State = {
  token: string | null
  username: string | null
  setToken: (t: string|null, u?: string|null) => void
}
export const useAuthStore = create<State>((set)=>({
  token: localStorage.getItem('token'),
  username: localStorage.getItem('username'),
  setToken: (t, u)=>{
    if (t) localStorage.setItem('token', t); else localStorage.removeItem('token')
    if (u!==undefined) { if(u) localStorage.setItem('username', u); else localStorage.removeItem('username')}
    set({ token: t, username: u ?? null })
  }
}))

export const api = axios.create()
api.interceptors.request.use((config)=>{
  const token = localStorage.getItem('token')
  if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
  return config
})
