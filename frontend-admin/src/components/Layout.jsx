import React, { useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { logout, api } from '../api.js'
import LogoBolsaSonido from './Logo.jsx'

const ENLACES = [
  { to: '/', etiqueta: 'Resumen', fin: true },
  { to: '/productos', etiqueta: 'Productos' },
  { to: '/categorias', etiqueta: 'Categorías' },
  { to: '/pedidos', etiqueta: 'Pedidos' },
  { to: '/ventas', etiqueta: 'Ventas' },
  { to: '/usuarios', etiqueta: 'Usuarios' },
  { to: '/resenas', etiqueta: 'Reseñas' }
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [nombreUsuario, setNombreUsuario] = useState(
    localStorage.getItem('username') || 'Usuario'
  )
  const [menuPerfil, setMenuPerfil] = useState(false)
  const menuRef = useRef(null) // Referencia al contenedor del menú

  // Cargar perfil desde el backend
  useEffect(() => {
    api('/api/mi-perfil/')
      .then(data => {
        setNombreUsuario(data.username)
        localStorage.setItem('username', data.username)
      })
      .catch(err => {
        console.error('No se pudo cargar el perfil:', err)
      })
  }, [])

  // Cerrar menú al hacer clic fuera de él
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuPerfil(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function cerrarSesion() {
    logout()
    navigate('/login')
  }

  // --- Lógica de búsqueda contextual ---
  const rutaBase = () => {
    const path = location.pathname
    if (path === '/' || path === '') return null
    if (path.startsWith('/productos')) return '/productos'
    if (path.startsWith('/categorias')) return '/categorias'
    if (path.startsWith('/usuarios')) return '/usuarios'
    if (path.startsWith('/pedidos')) return '/pedidos'
    if (path.startsWith('/resenas')) return '/resenas'
    return null
  }

  const base = rutaBase()
  const placeholder = base ? `Buscar en ${base.replace('/', '')}...` : 'Buscar...'

  const manejarBusqueda = (e) => {
    if (e.key === 'Enter') {
      const valor = e.target.value.trim()
      if (base) {
        navigate(valor ? `${base}?search=${encodeURIComponent(valor)}` : base)
      } else {
        alert('La búsqueda no está disponible en esta sección')
      }
    }
  }

  const searchParam = new URLSearchParams(location.search).get('search') || ''

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="marca">
          <LogoBolsaSonido size={26} color="var(--color-primario)" grosor={6} />
          Tienda<span>Música</span>
        </div>
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
          <strong>{nombreUsuario}</strong>
          <button className="btn-salir" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="contenido">
        <header className="topbar">
          <div className="search-container">
            <svg className="icon-search" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder={placeholder}
              className="search-input"
              onKeyDown={manejarBusqueda}
              defaultValue={searchParam}
            />
            <span className="shortcut">⌘K</span>
          </div>

          <div className="topbar-actions">
            <button className="btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>

            {/* Perfil con menú desplegable */}
            <div
              className="profile-menu"
              ref={menuRef}
              onClick={() => setMenuPerfil(!menuPerfil)}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <img
                src={`https://ui-avatars.com/api/?name=${nombreUsuario}&background=e2e8f0&color=0f172a`}
                alt="User Avatar"
                className="avatar"
              />
              <span className="user-name">{nombreUsuario}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>

              {/* Menú desplegable */}
              {menuPerfil && (
                <div className="dropdown-perfil">
                  <div
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuPerfil(false)
                      navigate('/perfil')
                    }}
                  >
                    Mi Perfil
                  </div>
                  <div
                    className="dropdown-item text-rojo"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuPerfil(false)
                      cerrarSesion()
                    }}
                  >
                    Cerrar sesión
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  )
}