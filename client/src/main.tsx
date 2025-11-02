import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, redirect } from 'react-router-dom'
import Login from './pages/Login'
import Maps from './pages/Maps'
import Canvas from './pages/Canvas'
import ShareView from './pages/ShareView'
import { useAuthStore } from './store'

function ThemeBoot() {
  React.useEffect(() => {
    const t = localStorage.getItem('theme') || 'dark'
    document.documentElement.setAttribute('data-theme', t)
  }, [])
  return null
}

const router = createBrowserRouter([
  { path: '/login', element: <Login/> },
  { path: '/', loader: () => { const t = localStorage.getItem('token'); if(!t) throw redirect('/login'); return null }, element: <Maps/> },
  { path: '/maps/:id', loader: () => { const t = localStorage.getItem('token'); if(!t) throw redirect('/login'); return null }, element: <Canvas/> },
  { path: '/share/:token', element: <ShareView/> },
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeBoot/>
    <RouterProvider router={router} />
  </React.StrictMode>
)
