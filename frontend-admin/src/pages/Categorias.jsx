import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'

export default function Categorias() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''

  const [categorias, setCategorias] = useState([])
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nombre, setNombre] = useState('')

  async function cargar() {
    try {
      const url = searchQuery ? `/api/categorias/?search=${encodeURIComponent(searchQuery)}` : '/api/categorias/'
      const data = await api(url)
      setCategorias(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { cargar() }, [searchQuery])

  function abrirNuevo() {
    setEditando(null)
    setNombre('')
    setModalAbierto(true)
  }

  function abrirEditar(cat) {
    setEditando(cat)
    setNombre(cat.nombre)
    setModalAbierto(true)
  }

  async function guardar(e) {
    e.preventDefault()
    try {
      if (editando) {
        await api(`/api/categorias/${editando.id}/`, { method: 'PUT', body: { nombre } })
      } else {
        await api('/api/categorias/', { method: 'POST', body: { nombre } })
      }
      setModalAbierto(false)
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function eliminar(cat) {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"? Esto también elimina sus productos.`)) return
    try {
      await api(`/api/categorias/${cat.id}/`, { method: 'DELETE' })
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>Categorías</h1>
          <p>Organiza tus productos por categoría</p>
        </div>
        <button className="btn btn-primario" onClick={abrirNuevo}>+ Nueva categoría</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tarjeta">
        {categorias.length === 0 ? (
          <div className="vacio">Aún no hay categorías. Crea la primera.</div>
        ) : (
          <table>
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.nombre}</td>
                  <td>
                    <div className="acciones-fila">
                      <button className="btn btn-secundario btn-chico" onClick={() => abrirEditar(c)}>Editar</button>
                      <button className="btn btn-peligro btn-chico" onClick={() => eliminar(c)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAbierto && (
        <div className="overlay" onClick={() => setModalAbierto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar categoría' : 'Nueva categoría'}</h2>
            <form onSubmit={guardar}>
              <label>Nombre</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
              <div className="modal-acciones">
                <button type="button" className="btn btn-secundario" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primario">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}