import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../context/ToastContext.jsx'
import Spinner from '../components/Spinner.jsx'
import { SkeletonFilas } from '../components/Skeleton.jsx'
import { IconEye } from '../components/icons.jsx'

const ESTADOS = ['pendiente', 'pagado', 'enviado', 'cancelado']

const CLASE_PILL = {
  pendiente: 'pill-warn',
  pagado: 'pill-info',
  enviado: 'pill-ok',
  cancelado: 'pill-fail'
}

export default function Pedidos() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const { showToast } = useToast()

  const [pedidos, setPedidos] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [error, setError] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [cambiandoId, setCambiandoId] = useState(null)

  async function cargar() {
    setCargandoLista(true)
    try {
      const url = searchQuery ? `/api/pedidos/?search=${encodeURIComponent(searchQuery)}` : '/api/pedidos/'
      const data = await api(url)
      setPedidos(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargandoLista(false)
    }
  }

  useEffect(() => { cargar() }, [searchQuery])

  async function cambiarEstado(pedido, nuevoEstado) {
    setCambiandoId(pedido.id)
    try {
      await api(`/api/pedidos/${pedido.id}/`, {
        method: 'PATCH',
        body: { estado: nuevoEstado }
      })
      showToast(`Pedido #${pedido.id} ahora está "${nuevoEstado}".`, 'success')
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setCambiandoId(null)
    }
  }

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>Pedidos</h1>
          <p>Todos los pedidos realizados por los clientes</p>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tarjeta">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {cargandoLista ? (
              <SkeletonFilas filas={5} columnas={6} />
            ) : pedidos.length === 0 ? (
              <tr><td colSpan="6"><div className="vacio">Todavía no hay pedidos.</div></td></tr>
            ) : (
              pedidos.map((p) => (
                <React.Fragment key={p.id}>
                  <tr>
                    <td>#{p.id}</td>
                    <td>{p.usuario}</td>
                    <td>{new Date(p.fecha).toLocaleString()}</td>
                    <td>${parseFloat(p.total).toFixed(2)}</td>
                    <td>
                      <span className={`pill ${CLASE_PILL[p.estado] || 'pill-neutral'}`}>{p.estado}</span>
                    </td>
                    <td>
                      <div className="acciones-fila">
                        <select
                          value={p.estado}
                          disabled={cambiandoId === p.id}
                          onChange={(e) => cambiarEstado(p, e.target.value)}
                          style={{ width: 'auto', padding: '6px 10px', fontSize: 12.5 }}
                        >
                          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                        {cambiandoId === p.id && <Spinner size={13} oscuro />}
                        <button
                          className="btn btn-secundario btn-chico"
                          onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                        >
                          <IconEye size={13} />
                          {expandido === p.id ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandido === p.id && (
                    <tr>
                      <td colSpan="6" className="fila-detalle">
                        <strong style={{ fontSize: 12.5 }}>Productos del pedido:</strong>
                        <ul style={{ margin: '8px 0 0 0', paddingLeft: 18, fontSize: 13 }}>
                          {p.detalles.map((d) => (
                            <li key={d.id}>
                              Producto #{d.producto} — cantidad: {d.cantidad} — subtotal: ${parseFloat(d.subtotal).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
