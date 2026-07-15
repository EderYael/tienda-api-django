import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { IconPackage, IconShoppingCart, IconUsers, IconDollarSign, IconStar } from '../components/icons.jsx'
import { SkeletonTarjetas } from '../components/Skeleton.jsx'

const COLOR_ESTADO = {
  pendiente: '#f59e0b',
  pagado: '#2563eb',
  enviado: '#10b981',
  cancelado: '#ef4444'
}

const NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// Usa componentes de fecha LOCALES (no toISOString, que fuerza UTC y puede
// correr la fecha un día dependiendo de la hora/zona horaria del navegador).
function claveDia(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Dashboard() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        const [productos, pedidos, usuarios, resenas] = await Promise.all([
          api('/api/productos/'),
          api('/api/pedidos/'),
          api('/api/usuarios/'),
          api('/api/resenas/')
        ])

        const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length
        const stockBajo = productos.filter((p) => p.stock <= 5).length
        const registrados = usuarios.filter((u) => u.rol === 'registrado').length
        const ventasTotales = pedidos
          .filter((p) => p.estado !== 'cancelado')
          .reduce((acc, p) => acc + parseFloat(p.total), 0)

        // Tendencia de ventas: últimos 7 días (por fecha local)
        const hoy = new Date()
        const dias = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date(hoy)
          d.setDate(d.getDate() - i)
          dias.push(d)
        }
        const tendencia = dias.map((d) => {
          const clave = claveDia(d)
          const total = pedidos
            .filter((p) => p.estado !== 'cancelado' && claveDia(p.fecha) === clave)
            .reduce((acc, p) => acc + parseFloat(p.total), 0)
          return { dia: NOMBRES_DIA[d.getDay()], total: Math.round(total * 100) / 100 }
        })

        // Distribución por estado
        const conteoEstado = { pendiente: 0, pagado: 0, enviado: 0, cancelado: 0 }
        pedidos.forEach((p) => { if (conteoEstado[p.estado] !== undefined) conteoEstado[p.estado]++ })
        const distribucion = Object.entries(conteoEstado)
          .filter(([, cant]) => cant > 0)
          .map(([estado, cantidad]) => ({ estado, cantidad }))

        // Top 5 productos más vendidos (por unidades acumuladas en DetallePedido)
        const cantidadPorProducto = {}
        pedidos.forEach((p) => {
          p.detalles.forEach((d) => {
            cantidadPorProducto[d.producto] = (cantidadPorProducto[d.producto] || 0) + d.cantidad
          })
        })
        const topProductos = Object.entries(cantidadPorProducto)
          .map(([id, cantidad]) => {
            const prod = productos.find((p) => p.id === parseInt(id, 10))
            return { nombre: prod ? prod.nombre : `#${id}`, cantidad }
          })
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 5)

        // Calificación promedio
        const promedioCalificacion = resenas.length
          ? resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length
          : 0

        setDatos({
          ventasTotales, pendientes, stockBajo, registrados,
          tendencia, distribucion, topProductos,
          promedioCalificacion, totalResenas: resenas.length
        })
        setError('')
      } catch (err) {
        setError(err.message)
      } finally {
        setCargando(false)
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

      {cargando ? (
        <SkeletonTarjetas cantidad={4} />
      ) : datos && (
        <>
          <div className="tarjetas-kpi">
            <TarjetaKpi titulo="Ventas totales" valor={`$${datos.ventasTotales.toFixed(2)}`} icono={<IconDollarSign size={17} />} color="#10b981" />
            <TarjetaKpi titulo="Pedidos pendientes" valor={datos.pendientes} icono={<IconShoppingCart size={17} />} color="#f59e0b" alerta={datos.pendientes > 0} />
            <TarjetaKpi titulo="Stock bajo (≤5)" valor={datos.stockBajo} icono={<IconPackage size={17} />} color="#ef4444" alerta={datos.stockBajo > 0} />
            <TarjetaKpi titulo="Usuarios registrados" valor={datos.registrados} icono={<IconUsers size={17} />} color="#2563eb" />
          </div>

          <div className="graficas-grid">
            <div className="grafica-tarjeta">
              <h3>Tendencia de ventas</h3>
              <p className="grafica-sub">Últimos 7 días</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={datos.tendencia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip formatter={(v) => [`$${v}`, 'Ventas']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grafica-tarjeta">
              <h3>Pedidos por estado</h3>
              <p className="grafica-sub">Distribución actual</p>
              {datos.distribucion.length === 0 ? (
                <div className="vacio">Sin pedidos todavía.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={datos.distribucion} dataKey="cantidad" nameKey="estado" innerRadius={55} outerRadius={80} paddingAngle={3}>
                        {datos.distribucion.map((d, i) => (
                          <Cell key={i} fill={COLOR_ESTADO[d.estado] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="leyenda-donut">
                    {datos.distribucion.map((d) => (
                      <span key={d.estado} className="leyenda-item">
                        <span className="leyenda-punto" style={{ background: COLOR_ESTADO[d.estado] }} />
                        {d.estado} ({d.cantidad})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="grafica-tarjeta">
              <h3>Productos más vendidos</h3>
              <p className="grafica-sub">Top 5 por unidades</p>
              {datos.topProductos.length === 0 ? (
                <div className="vacio">Aún no hay ventas.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={datos.topProductos} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="cantidad" fill="#2563eb" radius={[0, 8, 8, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grafica-tarjeta">
              <h3>Calificación promedio</h3>
              <p className="grafica-sub">Basado en {datos.totalResenas} reseña{datos.totalResenas !== 1 ? 's' : ''}</p>
              <div className="calificacion-grande">
                <span className="calificacion-numero">{datos.promedioCalificacion.toFixed(1)}</span>
                <div>
                  <div className="calificacion-estrellas">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <IconStar key={i} size={20} filled={i < Math.round(datos.promedioCalificacion)} />
                    ))}
                  </div>
                  <div className="calificacion-total">de 5 estrellas</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function TarjetaKpi({ titulo, valor, icono, color, alerta }) {
  return (
    <div className={`tarjeta-kpi ${alerta ? 'tarjeta-kpi-alerta' : ''}`}>
      <div className="tarjeta-kpi-encabezado">
        <span className="tarjeta-kpi-etiqueta">{titulo}</span>
        <span className="tarjeta-kpi-icono" style={{ background: `${color}1a`, color }}>
          {icono}
        </span>
      </div>
      <span className="tarjeta-kpi-valor">{valor}</span>
    </div>
  )
}
