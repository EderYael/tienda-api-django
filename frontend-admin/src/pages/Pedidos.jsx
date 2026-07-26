import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../context/ToastContext.jsx'
import Spinner from '../components/Spinner.jsx'
import ModalMotivo from '../components/ModalMotivo.jsx'
import { SkeletonFilas } from '../components/Skeleton.jsx'
import { IconEye } from '../components/icons.jsx'

const CLASE_PILL = {
  pendiente_pago: 'pill-warn',
  pagado: 'pill-info',
  enviado: 'pill-ok',
  entregado: 'pill-ok',
  cancelado: 'pill-fail'
}

const ETIQUETA_ESTADO = {
  pendiente_pago: 'Pendiente de pago',
  pagado: 'Pagado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
}

const ETIQUETA_METODO = {
  deposito: 'Depósito bancario',
  tarjeta: 'Tarjeta'
}

export default function Pedidos() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const { showToast } = useToast()

  const [pedidos, setPedidos] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [error, setError] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [accionEnCurso, setAccionEnCurso] = useState(null)
  const [pedidoACancelar, setPedidoACancelar] = useState(null)

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

  async function ejecutarAccion(pedido, endpoint, mensajeExito) {
    setAccionEnCurso(pedido.id)
    try {
      await api(`/api/pedidos/${pedido.id}/${endpoint}/`, { method: 'POST' })
      showToast(mensajeExito, 'success')
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAccionEnCurso(null)
    }
  }

  function confirmarDeposito(pedido) {
    ejecutarAccion(pedido, 'confirmar-deposito', `Depósito del pedido #${pedido.id} confirmado.`)
  }

  function marcarEnviado(pedido) {
    ejecutarAccion(pedido, 'marcar-enviado', `Pedido #${pedido.id} marcado como enviado.`)
  }

  function marcarEntregado(pedido) {
    ejecutarAccion(pedido, 'marcar-entregado', `Pedido #${pedido.id} marcado como entregado.`)
  }

  function cancelarPedido(pedido) {
    setPedidoACancelar(pedido)
  }

  async function confirmarCancelacion(motivo) {
    setAccionEnCurso(pedidoACancelar.id)
    try {
      await api(`/api/pedidos/${pedidoACancelar.id}/cancelar/`, { method: 'POST', body: { motivo } })
      showToast(`Pedido #${pedidoACancelar.id} cancelado.`, 'success')
      setPedidoACancelar(null)
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAccionEnCurso(null)
    }
  }

  function accionesDisponibles(pedido) {
    const enCurso = accionEnCurso === pedido.id
    const botones = []

    if (pedido.estado === 'pendiente_pago' && pedido.metodo_pago === 'deposito') {
      botones.push(
        <button key="confirmar-deposito" className="btn btn-primario btn-chico" disabled={enCurso} onClick={() => confirmarDeposito(pedido)}>
          Confirmar depósito
        </button>
      )
    }
    if (pedido.estado === 'pendiente_pago' && pedido.metodo_pago === 'tarjeta') {
      botones.push(<span key="esperando" className="campo-ayuda">Esperando pago del cliente</span>)
    }
    if (pedido.estado === 'pagado') {
      botones.push(
        <button key="marcar-enviado" className="btn btn-primario btn-chico" disabled={enCurso} onClick={() => marcarEnviado(pedido)}>
          Marcar enviado
        </button>
      )
    }
    if (pedido.estado === 'enviado') {
      botones.push(
        <button key="marcar-entregado" className="btn btn-primario btn-chico" disabled={enCurso} onClick={() => marcarEntregado(pedido)}>
          Marcar entregado
        </button>
      )
      botones.push(<span key="nota-entrega" className="campo-ayuda">o el cliente lo confirma solo</span>)
    }
    if (pedido.estado !== 'entregado' && pedido.estado !== 'cancelado') {
      botones.push(
        <button key="cancelar" className="btn btn-peligro btn-chico" disabled={enCurso} onClick={() => cancelarPedido(pedido)}>
          Cancelar
        </button>
      )
    }
    return botones
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
              <th>ID</th><th>Cliente</th><th>Fecha</th><th>Método</th><th>Total</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {cargandoLista ? (
              <SkeletonFilas filas={5} columnas={7} />
            ) : pedidos.length === 0 ? (
              <tr><td colSpan="7"><div className="vacio">Todavía no hay pedidos.</div></td></tr>
            ) : (
              pedidos.map((p) => (
                <React.Fragment key={p.id}>
                  <tr>
                    <td>#{p.id}</td>
                    <td>{p.usuario}</td>
                    <td>{new Date(p.fecha).toLocaleString()}</td>
                    <td>{ETIQUETA_METODO[p.metodo_pago] || p.metodo_pago}</td>
                    <td>${parseFloat(p.total).toFixed(2)}</td>
                    <td>
                      <span className={`pill ${CLASE_PILL[p.estado] || 'pill-neutral'}`}>
                        {ETIQUETA_ESTADO[p.estado] || p.estado}
                      </span>
                    </td>
                    <td>
                      <div className="acciones-fila">
                        {accionesDisponibles(p)}
                        {accionEnCurso === p.id && <Spinner size={13} oscuro />}
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
                      <td colSpan="7" className="fila-detalle">
                        <strong style={{ fontSize: 12.5 }}>Productos del pedido:</strong>
                        <ul style={{ margin: '8px 0 0 0', paddingLeft: 18, fontSize: 13 }}>
                          {p.detalles.map((d) => (
                            <li key={d.id}>
                              Producto #{d.producto} — cantidad: {d.cantidad} — subtotal: ${parseFloat(d.subtotal).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                        {p.estado === 'cancelado' && p.motivo_cancelacion && (
                          <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--rojo-error)' }}>
                            <strong>Motivo de cancelación:</strong> {p.motivo_cancelacion}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModalMotivo
        abierto={!!pedidoACancelar}
        titulo={pedidoACancelar ? `Cancelar pedido #${pedidoACancelar.id}` : ''}
        etiqueta="Motivo de la cancelación"
        placeholder="Ej. El cliente pidió cancelar, producto sin stock, error en el pedido..."
        textoBoton="Cancelar pedido"
        cargando={accionEnCurso === pedidoACancelar?.id}
        onCancelar={() => setPedidoACancelar(null)}
        onConfirmar={confirmarCancelacion}
      />
    </div>
  )
}
