import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../context/ToastContext.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { SkeletonFilas } from '../components/Skeleton.jsx'
import { IconStar } from '../components/icons.jsx'

export default function Resenas() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const { showToast } = useToast()

  const [resenas, setResenas] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  async function cargar() {
    setCargandoLista(true)
    try {
      const url = searchQuery ? `/api/resenas/?search=${encodeURIComponent(searchQuery)}` : '/api/resenas/'
      const data = await api(url)
      setResenas(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargandoLista(false)
    }
  }

  useEffect(() => { cargar() }, [searchQuery])

  async function confirmarEliminar() {
    if (!confirmando) return
    setEliminando(true)
    try {
      await api(`/api/resenas/${confirmando.id}/`, { method: 'DELETE' })
      showToast('La reseña se eliminó.', 'success')
      setConfirmando(null)
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEliminando(false)
    }
  }

  function estrellas(calificacion) {
    return (
      <div style={{ display: 'flex', gap: 2, color: '#f59e0b' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <IconStar key={i} size={14} filled={i < calificacion} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>Reseñas</h1>
          <p>Modera los comentarios y calificaciones de productos</p>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tarjeta">
        <table>
          <thead>
            <tr><th>Usuario</th><th>Producto</th><th>Calificación</th><th>Comentario</th><th>Fecha</th><th></th></tr>
          </thead>
          <tbody>
            {cargandoLista ? (
              <SkeletonFilas filas={4} columnas={6} />
            ) : resenas.length === 0 ? (
              <tr><td colSpan="6"><div className="vacio">Aún no hay reseñas.</div></td></tr>
            ) : (
              resenas.map((r) => (
                <tr key={r.id}>
                  <td>{r.usuario}</td>
                  <td>#{r.producto}</td>
                  <td>{estrellas(r.calificacion)}</td>
                  <td style={{ maxWidth: 260 }}>{r.comentario}</td>
                  <td>{new Date(r.fecha).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-peligro btn-chico" onClick={() => setConfirmando(r)}>Eliminar</button>
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
        titulo="Eliminar reseña"
        mensaje={confirmando ? `¿Eliminar la reseña de "${confirmando.usuario}"? Esta acción no se puede deshacer.` : ''}
      />
    </div>
  )
}
