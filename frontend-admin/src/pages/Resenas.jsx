import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Resenas() {
  const [resenas, setResenas] = useState([])
  const [error, setError] = useState('')

  async function cargar() {
    try {
      const data = await api('/api/resenas/')
      setResenas(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { cargar() }, [])

  async function eliminar(r) {
    if (!confirm(`¿Eliminar la reseña de "${r.usuario}"?`)) return
    try {
      await api(`/api/resenas/${r.id}/`, { method: 'DELETE' })
      cargar()
    } catch (err) {
      setError(err.message)
    }
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
        {resenas.length === 0 ? (
          <div className="vacio">Aún no hay reseñas.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Usuario</th><th>Producto</th><th>Calificación</th><th>Comentario</th><th>Fecha</th><th></th></tr>
            </thead>
            <tbody>
              {resenas.map((r) => (
                <tr key={r.id}>
                  <td>{r.usuario}</td>
                  <td>#{r.producto}</td>
                  <td>{'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}</td>
                  <td style={{ maxWidth: 260 }}>{r.comentario}</td>
                  <td>{new Date(r.fecha).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-peligro btn-chico" onClick={() => eliminar(r)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
