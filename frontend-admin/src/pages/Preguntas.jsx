import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../context/ToastContext.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Spinner from '../components/Spinner.jsx'
import { SkeletonFilas } from '../components/Skeleton.jsx'
import { IconHelpCircle } from '../components/icons.jsx'

export default function Preguntas() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const { showToast } = useToast()

  const [preguntas, setPreguntas] = useState([])
  const [productos, setProductos] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [error, setError] = useState('')
  const [borradores, setBorradores] = useState({}) // { [preguntaId]: texto en edición }
  const [respondiendoId, setRespondiendoId] = useState(null)
  const [confirmando, setConfirmando] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  async function cargar() {
    setCargandoLista(true)
    try {
      const url = searchQuery ? `/api/preguntas/?search=${encodeURIComponent(searchQuery)}` : '/api/preguntas/'
      const [datosPreguntas, datosProductos] = await Promise.all([api(url), api('/api/productos/')])
      // Sin responder primero, y entre esas, las más antiguas primero (las que llevan más esperando)
      const ordenadas = datosPreguntas.slice().sort((a, b) => {
        if (!!a.respuesta !== !!b.respuesta) return a.respuesta ? 1 : -1
        return new Date(a.fecha_pregunta) - new Date(b.fecha_pregunta)
      })
      setPreguntas(ordenadas)
      setProductos(datosProductos)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargandoLista(false)
    }
  }

  useEffect(() => { cargar() }, [searchQuery])

  function nombreProducto(id) {
    const p = productos.find((p) => p.id === id)
    return p ? p.nombre : `#${id}`
  }

  function actualizarBorrador(preguntaId, texto) {
    setBorradores({ ...borradores, [preguntaId]: texto })
  }

  async function responder(pregunta) {
    const texto = (borradores[pregunta.id] || '').trim()
    if (!texto) {
      showToast('Escribe una respuesta antes de enviarla.', 'error')
      return
    }
    setRespondiendoId(pregunta.id)
    try {
      await api(`/api/preguntas/${pregunta.id}/responder/`, { method: 'POST', body: { respuesta: texto } })
      showToast('Respuesta publicada.', 'success')
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setRespondiendoId(null)
    }
  }

  async function confirmarEliminar() {
    if (!confirmando) return
    setEliminando(true)
    try {
      await api(`/api/preguntas/${confirmando.id}/`, { method: 'DELETE' })
      showToast('Pregunta eliminada.', 'success')
      setConfirmando(null)
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEliminando(false)
    }
  }

  const sinResponder = preguntas.filter((p) => !p.respuesta).length

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>Preguntas y respuestas</h1>
          <p>
            {sinResponder > 0
              ? `${sinResponder} pregunta${sinResponder !== 1 ? 's' : ''} esperando respuesta`
              : 'Todas las preguntas están respondidas'}
          </p>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tarjeta">
        <table>
          <thead>
            <tr><th>Producto</th><th>Cliente</th><th>Pregunta</th><th>Respuesta</th><th>Fecha</th><th></th></tr>
          </thead>
          <tbody>
            {cargandoLista ? (
              <SkeletonFilas filas={4} columnas={6} />
            ) : preguntas.length === 0 ? (
              <tr><td colSpan="6"><div className="vacio">Aún no hay preguntas de clientes.</div></td></tr>
            ) : (
              preguntas.map((p) => (
                <tr key={p.id} className={!p.respuesta ? 'fila-destacada' : ''}>
                  <td>{nombreProducto(p.producto)}</td>
                  <td>{p.usuario}</td>
                  <td style={{ maxWidth: 220 }}>{p.pregunta}</td>
                  <td style={{ minWidth: 260 }}>
                    {p.respuesta ? (
                      <span>{p.respuesta}</span>
                    ) : (
                      <div className="respuesta-inline">
                        <textarea
                          rows="2"
                          placeholder="Escribe tu respuesta..."
                          value={borradores[p.id] || ''}
                          onChange={(e) => actualizarBorrador(p.id, e.target.value)}
                        />
                        <button
                          className="btn btn-primario btn-chico"
                          disabled={respondiendoId === p.id}
                          onClick={() => responder(p)}
                        >
                          {respondiendoId === p.id ? <Spinner size={12} /> : <IconHelpCircle size={13} />}
                          Responder
                        </button>
                      </div>
                    )}
                  </td>
                  <td>{new Date(p.fecha_pregunta).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-peligro btn-chico" onClick={() => setConfirmando(p)}>Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        abierto={!!confirmando}
        onClose={() => setConfirmando(null)}
        onConfirm={confirmarEliminar}
        cargando={eliminando}
        titulo="Eliminar pregunta"
        mensaje={confirmando ? `¿Eliminar la pregunta de "${confirmando.usuario}"? Esta acción no se puede deshacer.` : ''}
      />
    </div>
  )
}
