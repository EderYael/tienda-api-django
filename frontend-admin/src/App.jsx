import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Productos from './pages/Productos.jsx'
import Categorias from './pages/Categorias.jsx'
import Pedidos from './pages/Pedidos.jsx'
import Ventas from './pages/Ventas.jsx'
import Usuarios from './pages/Usuarios.jsx'
import Resenas from './pages/Resenas.jsx'
import Perfil from './pages/Perfil.jsx'
import { estaAutenticado } from './api.js'

function RutaProtegida({ children }) {
  if (!estaAutenticado()) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<Productos />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="resenas" element={<Resenas />} />
          <Route path="perfil" element={<Perfil />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
