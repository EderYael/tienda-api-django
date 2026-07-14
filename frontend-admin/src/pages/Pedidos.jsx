import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'

const ESTADOS = ['pendiente', 'pagado', 'enviado', 'cancelado']

const CLASE_PILL = {
  pendiente: 'pill-warn',
  pagado: 'pill-ok',
  enviado: 'pill-ok',
  cancelado: 'pill-fail'
}

export default function Pedidos() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''

  const [pedidos, setPedidos] = useState([])
  const [error, setError] = useState('')
  const [expandido, setExpandido] = useState(null)

  async function cargar() {
    try {
      const url = searchQuery ? `/api/pedidos/?search=${encodeURIComponent(searchQuery)}` : '/api/pedidos/'
      const data = await api(url)
      setPedidos(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { cargar() }, [searchQuery])

  async function cambiarEstado(pedido, nuevoEstado) {
    try {
      await api(`/api/pedidos/${pedido.id}/`, {
        method: 'PATCH',
        body: { estado: nuevoEstado }
      })
      cargar()
    } catch (err) {
      setError(err.message + ' (revisa el backend: PedidoSerializer necesita soportar PATCH parcial)')
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
        {pedidos.length === 0 ? (
          <div className="vacio">Todavía no hay pedidos.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <React.Fragment key={p.id}>
                  <tr>
                    <td>#{p.id}</td>
                    <td>{p.usuario}</td>
                    <td>{new Date(p.fecha).toLocaleString()}</td>
                    <td>${parseFloat(p.total).toFixed(2)}</td>
                    <td>
                      <span className={`pill ${CLASE_PILL[p.estado] || 'pill-registrado'}`}>{p.estado}</span>
                    </td>
                    <td>
                      <div className="acciones-fila">
                        <select
                          value={p.estado}
                          onChange={(e) => cambiarEstado(p, e.target.value)}
                          style={{ width: 'auto', padding: '5px 8px', fontSize: 12.5 }}
                        >
                          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <button
                          className="btn btn-secundario btn-chico"
                          onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                        >
                          {expandido === p.id ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandido === p.id && (
                    <tr>
                      <td colSpan="6" style={{ background: '#f8fafc' }}>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}