import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../api.js'

const ENLACES = [
  { to: '/', etiqueta: 'Resumen', fin: true },
  { to: '/productos', etiqueta: 'Productos' },
  { to: '/categorias', etiqueta: 'Categorías' },
  { to: '/pedidos', etiqueta: 'Pedidos' },
  { to: '/usuarios', etiqueta: 'Usuarios' },
  { to: '/resenas', etiqueta: 'Reseñas' }
]

export default function Layout() {
  const navigate = useNavigate()
  const username = localStorage.getItem('username') || 'admin'

  function cerrarSesion() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="marca">Tienda<span>Admin</span></div>
        <nav>
          {ENLACES.map((e) => (
            <NavLink
              key={e.to}
              to={e.to}
              end={e.fin}
              className={({ isActive }) => (isActive ? 'activo' : '')}
            >
              {e.etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="usuario-box">
          <strong>{username}</strong>
          <button className="btn-salir" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  )
}
