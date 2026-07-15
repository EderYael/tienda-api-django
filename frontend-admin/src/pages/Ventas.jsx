import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { exportarCSV } from '../utils/csv.js'
import { SkeletonTarjetas, SkeletonFilas } from '../components/Skeleton.jsx'
import { IconDownload, IconFilterX, IconDollarSign, IconShoppingCart, IconTrendingUp } from '../components/icons.jsx'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'

const ESTADOS = ['pendiente', 'pagado', 'enviado', 'cancelado']

const CLASE_PILL = {
  pendiente: 'pill-warn',
  pagado: 'pill-info',
  enviado: 'pill-ok',
  cancelado: 'pill-fail'
}

function claveDia(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function inicioSemana(d) {
  const copia = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dia = copia.getDay()
  const diff = (dia === 0 ? -6 : 1) - dia
  copia.setDate(copia.getDate() + diff)
  return copia
}

function agrupar(pedidos, granularidad) {
  const grupos = {}
  pedidos.forEach((p) => {
    if (p.estado === 'cancelado') return
    const fecha = new Date(p.fecha)
    let clave, etiqueta

    if (granularidad === 'dia') {
      clave = claveDia(fecha)
      etiqueta = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    } else if (granularidad === 'semana') {
      const lunes = inicioSemana(fecha)
      clave = claveDia(lunes)
      etiqueta = `Sem. ${lunes.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`
    } else {
      clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      etiqueta = fecha.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })
    }

    if (!grupos[clave]) grupos[clave] = { clave, etiqueta, total: 0, cantidad: 0 }
    grupos[clave].total += parseFloat(p.total)
    grupos[clave].cantidad += 1
  })
  return Object.values(grupos).sort((a, b) => a.clave.localeCompare(b.clave))
}

export default function Ventas() {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [estado, setEstado] = useState('')
  const [cliente, setCliente] = useState('')
  const [granularidad, setGranularidad] = useState('dia')

  useEffect(() => {
    setCargando(true)
    api('/api/pedidos/')
      .then((data) => { setPedidos(data); setError('') })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  const filtrados = useMemo(() => {
    return pedidos.filter((p) => {
      const clave = claveDia(p.fecha)
      if (desde && clave < desde) return false
      if (hasta && clave > hasta) return false
      if (estado && p.estado !== estado) return false
      if (cliente && !p.usuario.toLowerCase().includes(cliente.toLowerCase())) return false
      return true
    })
  }, [pedidos, desde, hasta, estado, cliente])

  const grupos = useMemo(() => agrupar(filtrados, granularidad), [filtrados, granularidad])

  const resumen = useMemo(() => {
    const validos = filtrados.filter((p) => p.estado !== 'cancelado')
    const totalVentas = validos.reduce((acc, p) => acc + parseFloat(p.total), 0)
    return {
      totalVentas,
      totalPedidos: filtrados.length,
      promedio: validos.length ? totalVentas / validos.length : 0
    }
  }, [filtrados])

  function limpiarFiltros() {
    setDesde(''); setHasta(''); setEstado(''); setCliente('')
  }

  function exportar() {
    exportarCSV(
      filtrados,
      [
        { titulo: 'ID', valor: 'id' },
        { titulo: 'Cliente', valor: 'usuario' },
        { titulo: 'Fecha', valor: (p) => new Date(p.fecha).toLocaleString('es-MX') },
        { titulo: 'Estado', valor: 'estado' },
        { titulo: 'Total', valor: (p) => parseFloat(p.total).toFixed(2) }
      ],
      `ventas_${claveDia(new Date())}.csv`
    )
  }

  const hayFiltrosActivos = desde || hasta || estado || cliente

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>Ventas</h1>
          <p>Filtra, agrupa y exporta el detalle de ventas</p>
        </div>
        <button className="btn btn-secundario" onClick={exportar} disabled={filtrados.length === 0}>
          <IconDownload size={15} /> Exportar CSV
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* Filtros */}
      <div className="tarjeta filtros-ventas">
        <div className="campo-filtro">
          <label>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="campo-filtro">
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="campo-filtro">
          <label>Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="campo-filtro" style={{ flex: 1 }}>
          <label>Cliente</label>
          <input placeholder="Buscar por usuario..." value={cliente} onChange={(e) => setCliente(e.target.value)} />
        </div>
        {hayFiltrosActivos && (
          <button type="button" className="btn btn-secundario btn-chico" onClick={limpiarFiltros}>
            <IconFilterX size={14} /> Limpiar
          </button>
        )}
      </div>

      {cargando ? (
        <SkeletonTarjetas cantidad={3} />
      ) : (
        <div className="tarjetas-kpi" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <TarjetaResumen titulo="Ventas totales" valor={`$${resumen.totalVentas.toFixed(2)}`} icono={<IconDollarSign size={17} />} color="#10b981" />
          <TarjetaResumen titulo="Pedidos en el filtro" valor={resumen.totalPedidos} icono={<IconShoppingCart size={17} />} color="#2563eb" />
          <TarjetaResumen titulo="Promedio por pedido" valor={`$${resumen.promedio.toFixed(2)}`} icono={<IconTrendingUp size={17} />} color="#f59e0b" />
        </div>
      )}

      {/* Totales agrupados */}
      <div className="grafica-tarjeta" style={{ marginBottom: 20 }}>
        <div className="encabezado" style={{ marginBottom: 4 }}>
          <div>
            <h3 style={{ margin: 0 }}>Totales agrupados</h3>
            <p className="grafica-sub">No incluye pedidos cancelados</p>
          </div>
          <div className="selector-granularidad">
            {['dia', 'semana', 'mes'].map((g) => (
              <button
                key={g}
                type="button"
                className={granularidad === g ? 'activo' : ''}
                onClick={() => setGranularidad(g)}
              >
                {g === 'dia' ? 'Día' : g === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        {!cargando && grupos.length === 0 ? (
          <div className="vacio">No hay ventas con estos filtros.</div>
        ) : !cargando && (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={grupos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} />
              <Tooltip formatter={(v, n) => [n === 'total' ? `$${v.toFixed(2)}` : v, n === 'total' ? 'Total' : 'Pedidos']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detalle */}
      <div className="tarjeta">
        <table>
          <thead>
            <tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th>Total</th></tr>
          </thead>
          <tbody>
            {cargando ? (
              <SkeletonFilas filas={5} columnas={5} />
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="5"><div className="vacio">Ningún pedido coincide con estos filtros.</div></td></tr>
            ) : (
              filtrados
                .slice()
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                .map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>{p.usuario}</td>
                    <td>{new Date(p.fecha).toLocaleString('es-MX')}</td>
                    <td><span className={`pill ${CLASE_PILL[p.estado] || 'pill-neutral'}`}>{p.estado}</span></td>
                    <td>${parseFloat(p.total).toFixed(2)}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TarjetaResumen({ titulo, valor, icono, color }) {
  return (
    <div className="tarjeta-kpi">
      <div className="tarjeta-kpi-encabezado">
        <span className="tarjeta-kpi-etiqueta">{titulo}</span>
        <span className="tarjeta-kpi-icono" style={{ background: `${color}1a`, color }}>{icono}</span>
      </div>
      <span className="tarjeta-kpi-valor">{valor}</span>
    </div>
  )
}
