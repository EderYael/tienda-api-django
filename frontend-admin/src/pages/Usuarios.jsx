import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const VACIO = { username: '', email: '', password: '', rol: 'registrado' }

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(VACIO)

  async function cargar() {
    try {
      const data = await api('/api/usuarios/')
      setUsuarios(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { cargar() }, [])

  function abrirNuevo() {
    setEditando(null)
    setForm(VACIO)
    setModalAbierto(true)
  }

  function abrirEditar(u) {
    setEditando(u)
    setForm({ username: u.username, email: u.email, password: '', rol: u.rol })
    setModalAbierto(true)
  }

  async function guardar(e) {
    e.preventDefault()
    try {
      const body = { username: form.username, email: form.email, rol: form.rol }
      if (form.password) body.password = form.password

      if (editando) {
        await api(`/api/usuarios/${editando.id}/`, { method: 'PATCH', body })
      } else {
        await api('/api/usuarios/', { method: 'POST', body })
      }
      setModalAbierto(false)
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function eliminar(u) {
    if (!confirm(`¿Eliminar al usuario "${u.username}"?`)) return
    try {
      await api(`/api/usuarios/${u.id}/`, { method: 'DELETE' })
      cargar()
    } catch (err) {
      setError(err.message)
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
        {usuarios.length === 0 ? (
          <div className="vacio">No hay usuarios registrados.</div>
        ) : (
          <table>
            <thead>
              <tr><th>ID</th><th>Usuario</th><th>Email</th><th>Rol</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`pill ${u.rol === 'administrador' ? 'pill-admin' : 'pill-registrado'}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-fila">
                      <button className="btn btn-secundario btn-chico" onClick={() => abrirEditar(u)}>Editar</button>
                      <button className="btn btn-peligro btn-chico" onClick={() => eliminar(u)}>Eliminar</button>
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
            <h2>{editando ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            <form onSubmit={guardar}>
              <label>Usuario</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />

              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

              <label>Contraseña {editando ? '(dejar vacío para no cambiarla)' : ''}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

              <label>Rol</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                <option value="registrado">Usuario Registrado</option>
                <option value="administrador">Administrador</option>
              </select>

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
