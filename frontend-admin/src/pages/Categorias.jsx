import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../context/ToastContext.jsx'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Spinner from '../components/Spinner.jsx'
import { SkeletonFilas } from '../components/Skeleton.jsx'
import { validarCategoria, erroresDeApi } from '../utils/validacion.js'

export default function Categorias() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const { showToast } = useToast()

  const [categorias, setCategorias] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nombre, setNombre] = useState('')
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  const [confirmando, setConfirmando] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  async function cargar() {
    setCargandoLista(true)
    try {
      const url = searchQuery ? `/api/categorias/?search=${encodeURIComponent(searchQuery)}` : '/api/categorias/'
      const data = await api(url)
      setCategorias(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargandoLista(false)
    }
  }

  useEffect(() => { cargar() }, [searchQuery])

  function abrirNuevo() {
    setEditando(null)
    setNombre('')
    setErrores({})
    setModalAbierto(true)
  }

  function abrirEditar(cat) {
    setEditando(cat)
    setNombre(cat.nombre)
    setErrores({})
    setModalAbierto(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const erroresLocales = validarCategoria(nombre)
    if (Object.keys(erroresLocales).length > 0) {
      setErrores(erroresLocales)
      return
    }
    if (guardando) return
    setGuardando(true)
    try {
      if (editando) {
        await api(`/api/categorias/${editando.id}/`, { method: 'PUT', body: { nombre } })
        showToast(`"${nombre}" se actualizó correctamente.`, 'success')
      } else {
        await api('/api/categorias/', { method: 'POST', body: { nombre } })
        showToast(`"${nombre}" se creó correctamente.`, 'success')
      }
      setModalAbierto(false)
      cargar()
    } catch (err) {
      const erroresApi = erroresDeApi(err.data)
      if (Object.keys(erroresApi).length > 0) {
        setErrores(erroresApi)
      } else {
        showToast(err.message, 'error')
      }
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarEliminar() {
    if (!confirmando) return
    setEliminando(true)
    try {
      await api(`/api/categorias/${confirmando.id}/`, { method: 'DELETE' })
      showToast(`"${confirmando.nombre}" se eliminó.`, 'success')
      setConfirmando(null)
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEliminando(false)
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
        <table>
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {cargandoLista ? (
              <SkeletonFilas filas={4} columnas={3} />
            ) : categorias.length === 0 ? (
              <tr><td colSpan="3"><div className="vacio">Aún no hay categorías. Crea la primera.</div></td></tr>
            ) : (
              categorias.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.nombre}</td>
                  <td>
                    <div className="acciones-fila">
                      <button className="btn btn-secundario btn-chico" onClick={() => abrirEditar(c)}>Editar</button>
                      <button className="btn btn-peligro btn-chico" onClick={() => setConfirmando(c)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal abierto={modalAbierto} onClose={() => setModalAbierto(false)} titulo={editando ? 'Editar categoría' : 'Nueva categoría'} ancho="400px">
        <form onSubmit={guardar}>
          <label>Nombre</label>
          <input
            className={errores.nombre ? 'input-error' : ''}
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setErrores({ ...errores, nombre: null }) }}
            autoFocus
          />
          {errores.nombre && <span className="campo-error">{errores.nombre}</span>}

          <div className="modal-acciones">
            <button type="button" className="btn btn-secundario" onClick={() => setModalAbierto(false)} disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn btn-primario" disabled={guardando}>
              {guardando ? <Spinner size={14} /> : null}
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        abierto={!!confirmando}
        onClose={() => setConfirmando(null)}
        onConfirm={confirmarEliminar}
        cargando={eliminando}
        titulo="Eliminar categoría"
        mensaje={confirmando ? `¿Eliminar "${confirmando.nombre}"? Esto también elimina sus productos asociados. Esta acción no se puede deshacer.` : ''}
      />
    </div>
  )
}
