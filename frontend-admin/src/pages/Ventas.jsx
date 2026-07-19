import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../context/ToastContext.jsx'
import { exportarCSV } from '../utils/csv.js'
import Modal from '../components/Modal.jsx'
import Spinner from '../components/Spinner.jsx'
import { SkeletonTarjetas, SkeletonFilas } from '../components/Skeleton.jsx'
import {
  IconDownload, IconFilterX, IconDollarSign, IconShoppingCart, IconTrendingUp, IconStar
} from '../components/icons.jsx'
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
  const { showToast } = useToast()

  const [pedidos, setPedidos] = useState([])
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [resenas, setResenas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [estado, setEstado] = useState('')
  const [cliente, setCliente] = useState('')
  const [granularidad, setGranularidad] = useState('dia')

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [generandoExcel, setGenerandoExcel] = useState(false)

  useEffect(() => {
    setCargando(true)
    Promise.allSettled([
      api('/api/pedidos/'),
      api('/api/productos/'),
      api('/api/categorias/'),
      api('/api/resenas/'),
    ]).then(([rPedidos, rProductos, rCategorias, rResenas]) => {
      setPedidos(rPedidos.status === 'fulfilled' ? rPedidos.value : [])
      setProductos(rProductos.status === 'fulfilled' ? rProductos.value : [])
      setCategorias(rCategorias.status === 'fulfilled' ? rCategorias.value : [])
      setResenas(rResenas.status === 'fulfilled' ? rResenas.value : [])

      const fallos = []
      if (rPedidos.status === 'rejected') fallos.push('pedidos')
      if (rProductos.status === 'rejected') fallos.push('productos')
      if (rCategorias.status === 'rejected') fallos.push('categorías')
      if (rResenas.status === 'rejected') fallos.push('reseñas')
      setError(fallos.length > 0 ? `No se pudo cargar: ${fallos.join(', ')}. El resto se muestra con lo disponible.` : '')
    }).finally(() => setCargando(false))
  }, [])

  const mapaCategoriaPorProducto = useMemo(() => {
    const mapa = {}
    productos.forEach((p) => { mapa[p.id] = p.categoria })
    return mapa
  }, [productos])

  const mapaNombreCategoria = useMemo(() => {
    const mapa = {}
    categorias.forEach((c) => { mapa[c.id] = c.nombre })
    return mapa
  }, [categorias])

  const mapaNombreProducto = useMemo(() => {
    const mapa = {}
    productos.forEach((p) => { mapa[p.id] = p.nombre })
    return mapa
  }, [productos])

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
    const unidadesVendidas = validos.reduce(
      (acc, p) => acc + p.detalles.reduce((a2, d) => a2 + d.cantidad, 0), 0
    )
    return {
      totalVentas,
      totalPedidos: filtrados.length,
      promedio: validos.length ? totalVentas / validos.length : 0,
      unidadesVendidas,
    }
  }, [filtrados])

  const distribucionEstado = useMemo(() => {
    const conteo = {}
    filtrados.forEach((p) => { conteo[p.estado] = (conteo[p.estado] || 0) + 1 })
    return Object.entries(conteo).map(([estado, cantidad]) => ({ estado, cantidad }))
  }, [filtrados])

  const topProductos = useMemo(() => {
    const cantidadPorProducto = {}
    filtrados.forEach((p) => {
      if (p.estado === 'cancelado') return
      p.detalles.forEach((d) => {
        cantidadPorProducto[d.producto] = (cantidadPorProducto[d.producto] || 0) + d.cantidad
      })
    })
    return Object.entries(cantidadPorProducto)
      .map(([id, cantidad]) => ({ nombre: mapaNombreProducto[id] || `#${id}`, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
  }, [filtrados, mapaNombreProducto])

  const topCategorias = useMemo(() => {
    const totalPorCategoria = {}
    filtrados.forEach((p) => {
      if (p.estado === 'cancelado') return
      p.detalles.forEach((d) => {
        const catId = mapaCategoriaPorProducto[d.producto]
        if (catId == null) return
        totalPorCategoria[catId] = (totalPorCategoria[catId] || 0) + parseFloat(d.subtotal)
      })
    })
    return Object.entries(totalPorCategoria)
      .map(([id, total]) => ({ nombre: mapaNombreCategoria[id] || `#${id}`, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [filtrados, mapaCategoriaPorProducto, mapaNombreCategoria])

  const topClientes = useMemo(() => {
    const porCliente = {}
    filtrados.forEach((p) => {
      if (p.estado === 'cancelado') return
      if (!porCliente[p.usuario]) porCliente[p.usuario] = { username: p.usuario, totalPedidos: 0, totalGastado: 0 }
      porCliente[p.usuario].totalPedidos += 1
      porCliente[p.usuario].totalGastado += parseFloat(p.total)
    })
    return Object.values(porCliente).sort((a, b) => b.totalGastado - a.totalGastado).slice(0, 8)
  }, [filtrados])

  // Snapshot de inventario actual: NO depende del rango de fechas del filtro,
  // porque el stock es "ahora mismo", no algo que haya pasado en el pasado.
  const productosStockBajo = useMemo(() => {
    return productos
      .filter((p) => p.stock <= 5)
      .map((p) => ({ nombre: p.nombre, stock: p.stock }))
      .sort((a, b) => a.stock - b.stock)
  }, [productos])

  const detalleClienteSeleccionado = useMemo(() => {
    if (!clienteSeleccionado) return null
    const resumenCliente = topClientes.find((c) => c.username === clienteSeleccionado)
    const pedidosDelCliente = filtrados
      .filter((p) => p.usuario === clienteSeleccionado)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    const resenasDelCliente = resenas.filter((r) => r.usuario === clienteSeleccionado)
    const promedioCalificacion = resenasDelCliente.length
      ? resenasDelCliente.reduce((acc, r) => acc + r.calificacion, 0) / resenasDelCliente.length
      : null
    return {
      username: clienteSeleccionado,
      totalPedidos: resumenCliente?.totalPedidos ?? pedidosDelCliente.length,
      totalGastado: resumenCliente?.totalGastado ?? 0,
      pedidos: pedidosDelCliente,
      totalResenas: resenasDelCliente.length,
      promedioCalificacion,
    }
  }, [clienteSeleccionado, topClientes, filtrados, resenas])

  function limpiarFiltros() {
    setDesde(''); setHasta(''); setEstado(''); setCliente('')
  }

  function construirDatosReporte() {
    return {
      filtros: { desde, hasta, estado, cliente },
      resumen,
      distribucionEstado,
      topProductos,
      topCategorias,
      topClientes,
      productosStockBajo,
      pedidos: filtrados.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    }
  }

  function exportarCSVDetalle() {
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

  async function descargarPDF() {
    setGenerandoPDF(true)
    try {
      // Import dinámico: jsPDF + jspdf-autotable solo se descargan cuando el
      // admin de verdad hace click aquí, no en cada carga de la app.
      const { generarReportePDF } = await import('../utils/reportes.js')
      generarReportePDF(construirDatosReporte())
      showToast('El reporte en PDF se descargó correctamente.', 'success')
    } catch (err) {
      showToast('No se pudo generar el PDF: ' + err.message, 'error')
    } finally {
      setGenerandoPDF(false)
    }
  }

  async function descargarExcel() {
    setGenerandoExcel(true)
    try {
      const { generarReporteExcel } = await import('../utils/reportes.js')
      await generarReporteExcel(construirDatosReporte())
      showToast('El reporte en Excel se descargó correctamente.', 'success')
    } catch (err) {
      showToast('No se pudo generar el Excel: ' + err.message, 'error')
    } finally {
      setGenerandoExcel(false)
    }
  }

  const hayFiltrosActivos = desde || hasta || estado || cliente
  const hayDatosParaReporte = filtrados.length > 0

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>Ventas</h1>
          <p>Filtra, agrupa y exporta el detalle de ventas</p>
        </div>
        <div className="acciones-fila">
          <button className="btn btn-secundario" onClick={exportarCSVDetalle} disabled={!hayDatosParaReporte}>
            <IconDownload size={15} /> CSV
          </button>
          <button className="btn btn-secundario" onClick={descargarPDF} disabled={!hayDatosParaReporte || generandoPDF}>
            {generandoPDF ? <Spinner size={13} oscuro /> : <IconDownload size={15} />} PDF
          </button>
          <button className="btn btn-secundario" onClick={descargarExcel} disabled={!hayDatosParaReporte || generandoExcel}>
            {generandoExcel ? <Spinner size={13} oscuro /> : <IconDownload size={15} />} Excel
          </button>
        </div>
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

      {/* Top categorías + Top clientes */}
      <div className="graficas-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
        <div className="grafica-tarjeta">
          <h3 style={{ margin: '0 0 4px 0' }}>Categorías con más ingresos</h3>
          <p className="grafica-sub">Dentro del filtro actual</p>
          {topCategorias.length === 0 ? (
            <div className="vacio">Sin datos suficientes todavía.</div>
          ) : (
            <ul className="lista-ranking">
              {topCategorias.map((c, i) => (
                <li key={c.nombre}>
                  <span className="lista-ranking-num">{i + 1}</span>
                  <span className="lista-ranking-nombre">{c.nombre}</span>
                  <span className="lista-ranking-valor">${c.total.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grafica-tarjeta">
          <h3 style={{ margin: '0 0 4px 0' }}>Mejores clientes</h3>
          <p className="grafica-sub">Click para ver más detalle</p>
          {topClientes.length === 0 ? (
            <div className="vacio">Sin datos suficientes todavía.</div>
          ) : (
            <ul className="lista-ranking lista-ranking-clicable">
              {topClientes.map((c, i) => (
                <li key={c.username} onClick={() => setClienteSeleccionado(c.username)} tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setClienteSeleccionado(c.username) }}>
                  <span className="lista-ranking-num">{i + 1}</span>
                  <span className="lista-ranking-nombre">{c.username}</span>
                  <span className="lista-ranking-valor">${c.totalGastado.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
                    <td>
                      <button className="enlace-cliente" onClick={() => setClienteSeleccionado(p.usuario)}>
                        {p.usuario}
                      </button>
                    </td>
                    <td>{new Date(p.fecha).toLocaleString('es-MX')}</td>
                    <td><span className={`pill ${CLASE_PILL[p.estado] || 'pill-neutral'}`}>{p.estado}</span></td>
                    <td>${parseFloat(p.total).toFixed(2)}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        abierto={!!clienteSeleccionado}
        onClose={() => setClienteSeleccionado(null)}
        titulo={clienteSeleccionado || ''}
        ancho="480px"
      >
        {detalleClienteSeleccionado && (
          <div className="detalle-cliente">
            <div className="detalle-cliente-stats">
              <div>
                <span className="perfil-etiqueta">Pedidos (en el filtro)</span>
                <span className="perfil-valor">{detalleClienteSeleccionado.totalPedidos}</span>
              </div>
              <div>
                <span className="perfil-etiqueta">Total gastado</span>
                <span className="perfil-valor">${detalleClienteSeleccionado.totalGastado.toFixed(2)}</span>
              </div>
              <div>
                <span className="perfil-etiqueta">Calificación otorgada</span>
                <span className="perfil-valor">
                  {detalleClienteSeleccionado.promedioCalificacion != null ? (
                    <>
                      {detalleClienteSeleccionado.promedioCalificacion.toFixed(1)}
                      <IconStar size={13} filled style={{ marginLeft: 4, color: '#f59e0b', verticalAlign: 'middle' }} />
                      <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--texto-claro)' }}> ({detalleClienteSeleccionado.totalResenas})</span>
                    </>
                  ) : 'Sin reseñas'}
                </span>
              </div>
            </div>

            <h4 className="detalle-cliente-subtitulo">Pedidos en este filtro</h4>
            {detalleClienteSeleccionado.pedidos.length === 0 ? (
              <div className="vacio">No tiene pedidos en el rango/filtro actual.</div>
            ) : (
              <ul className="detalle-cliente-pedidos">
                {detalleClienteSeleccionado.pedidos.map((p) => (
                  <li key={p.id}>
                    <span>#{p.id} · {new Date(p.fecha).toLocaleDateString('es-MX')}</span>
                    <span className={`pill ${CLASE_PILL[p.estado] || 'pill-neutral'}`}>{p.estado}</span>
                    <span>${parseFloat(p.total).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
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
