import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Dashboard() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargar() {
      try {
        const [productos, pedidos, usuarios] = await Promise.all([
          api('/api/productos/'),
          api('/api/pedidos/'),
          api('/api/usuarios/')
        ])
        const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length
        const stockBajo = productos.filter((p) => p.stock <= 5).length
        setDatos({
          totalProductos: productos.length,
          totalPedidos: pedidos.length,
          pedidosPendientes: pendientes,
          totalUsuarios: usuarios.length,
          stockBajo
        })
      } catch (err) {
        setError(err.message)
      }
    }
    cargar()
  }, [])

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>Resumen</h1>
          <p>Vista general de la tienda</p>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {datos && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <Tarjeta titulo="Productos" valor={datos.totalProductos} />
          <Tarjeta titulo="Pedidos totales" valor={datos.totalPedidos} />
          <Tarjeta titulo="Pedidos pendientes" valor={datos.pedidosPendientes} alerta={datos.pedidosPendientes > 0} />
          <Tarjeta titulo="Usuarios" valor={datos.totalUsuarios} />
          <Tarjeta titulo="Productos con stock bajo (≤5)" valor={datos.stockBajo} alerta={datos.stockBajo > 0} />
        </div>
      )}
    </div>
  )
}

function Tarjeta({ titulo, valor, alerta }) {
  return (
    <div className="tarjeta" style={{ padding: '18px 18px' }}>
      <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: alerta ? '#dc2626' : '#0f172a' }}>{valor}</div>
    </div>
  )
}
