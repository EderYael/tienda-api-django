import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../context/ToastContext.jsx'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Spinner from '../components/Spinner.jsx'
import { SkeletonFilas } from '../components/Skeleton.jsx'
import { IconLock, IconUnlock } from '../components/icons.jsx'
import { validarUsuario, erroresDeApi } from '../utils/validacion.js'

const VACIO = { username: '', email: '', password: '', rol: 'registrado' }

export default function Usuarios() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const { showToast } = useToast()
  const usuarioActual = localStorage.getItem('username') || ''

  const [usuarios, setUsuarios] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null)

  const [confirmando, setConfirmando] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  async function cargar() {
    setCargandoLista(true)
    try {
      const url = searchQuery ? `/api/usuarios/?search=${encodeURIComponent(searchQuery)}` : '/api/usuarios/'
      const data = await api(url)
      setUsuarios(data)
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
    setForm(VACIO)
    setErrores({})
    setModalAbierto(true)
  }

  function abrirEditar(u) {
    setEditando(u)
    setForm({ username: u.username, email: u.email, password: '', rol: u.rol })
    setErrores({})
    setModalAbierto(true)
  }

  function actualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }

  async function guardar(e) {
    e.preventDefault()
    const erroresLocales = validarUsuario(form, !editando)
    if (Object.keys(erroresLocales).length > 0) {
      setErrores(erroresLocales)
      return
    }
    if (guardando) return
    setGuardando(true)
    try {
      const body = { username: form.username, email: form.email, rol: form.rol }
      if (form.password) body.password = form.password

      if (editando) {
        await api(`/api/usuarios/${editando.id}/`, { method: 'PATCH', body })
      } else {
        await api('/api/usuarios/', { method: 'POST', body })
      }
      showToast(`Usuario "${form.username}" se ${editando ? 'actualizó' : 'creó'} correctamente.`, 'success')
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
      await api(`/api/usuarios/${confirmando.id}/`, { method: 'DELETE' })
      showToast(`Usuario "${confirmando.username}" se eliminó.`, 'success')
      setConfirmando(null)
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEliminando(false)
    }
  }

  async function alternarActivo(u) {
    setCambiandoEstadoId(u.id)
    try {
      await api(`/api/usuarios/${u.id}/`, { method: 'PATCH', body: { is_active: !u.is_active } })
      showToast(
        u.is_active ? `"${u.username}" fue suspendido. Ya no podrá iniciar sesión.` : `"${u.username}" fue reactivado.`,
        'success'
      )
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setCambiandoEstadoId(null)
    }
  }

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>Usuarios</h1>
          <p>Gestiona clientes y administradores</p>
        </div>
        <button className="btn btn-primario" onClick={abrirNuevo}>+ Nuevo usuario</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tarjeta">
        <table>
          <thead>
            <tr><th>ID</th><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {cargandoLista ? (
              <SkeletonFilas filas={4} columnas={6} />
            ) : usuarios.length === 0 ? (
              <tr><td colSpan="6"><div className="vacio">No hay usuarios registrados.</div></td></tr>
            ) : (
              usuarios.map((u) => {
                const esUsuarioActual = u.username === usuarioActual
                return (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}{esUsuarioActual && <span className="etiqueta-tu">tú</span>}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`pill ${u.rol === 'administrador' ? 'pill-admin' : 'pill-neutral'}`}>
                        {u.rol}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${u.is_active ? 'pill-ok' : 'pill-fail'}`}>
                        {u.is_active ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td>
                      <div className="acciones-fila">
                        <button className="btn btn-secundario btn-chico" onClick={() => abrirEditar(u)}>Editar</button>
                        <button
                          className="btn btn-secundario btn-chico"
                          onClick={() => alternarActivo(u)}
                          disabled={esUsuarioActual || cambiandoEstadoId === u.id}
                          title={esUsuarioActual ? 'No puedes suspender tu propia cuenta' : ''}
                        >
                          {cambiandoEstadoId === u.id
                            ? <Spinner size={12} oscuro />
                            : (u.is_active ? <IconLock size={13} /> : <IconUnlock size={13} />)}
                          {u.is_active ? 'Suspender' : 'Activar'}
                        </button>
                        <button
                          className="btn btn-peligro btn-chico"
                          onClick={() => setConfirmando(u)}
                          disabled={esUsuarioActual}
                          title={esUsuarioActual ? 'No puedes eliminar tu propia cuenta' : ''}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal abierto={modalAbierto} onClose={() => setModalAbierto(false)} titulo={editando ? 'Editar usuario' : 'Nuevo usuario'} ancho="420px">
        <form onSubmit={guardar}>
          <label>Usuario</label>
          <input className={errores.username ? 'input-error' : ''} value={form.username} onChange={(e) => actualizarCampo('username', e.target.value)} />
          {errores.username && <span className="campo-error">{errores.username}</span>}

          <label>Email</label>
          <input className={errores.email ? 'input-error' : ''} type="email" value={form.email} onChange={(e) => actualizarCampo('email', e.target.value)} />
          {errores.email && <span className="campo-error">{errores.email}</span>}

          <label>Contraseña {editando ? '(dejar vacío para no cambiarla)' : ''}</label>
          <input className={errores.password ? 'input-error' : ''} type="password" value={form.password} onChange={(e) => actualizarCampo('password', e.target.value)} />
          {errores.password && <span className="campo-error">{errores.password}</span>}

          <label>Rol</label>
          <select value={form.rol} onChange={(e) => actualizarCampo('rol', e.target.value)}>
            <option value="registrado">Usuario Registrado</option>
            <option value="administrador">Administrador</option>
          </select>

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
        titulo="Eliminar usuario"
        mensaje={confirmando ? `¿Eliminar a "${confirmando.username}"? Esta acción no se puede deshacer.` : ''}
      />
    </div>
  )
}
