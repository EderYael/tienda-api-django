import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, getBaseUrl, setBaseUrl } from '../api.js'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [url, setUrl] = useState(getBaseUrl())
  const navigate = useNavigate()

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function guardarUrl() {
    setBaseUrl(url)
  }

  return (
    <div className="login-pantalla">
      <div className="login-caja">
        <h1>Panel de Administración</h1>
        <div className="sub">Tienda — acceso exclusivo para administradores</div>

        <form onSubmit={manejarSubmit}>
          <label>Usuario</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />

          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {error && <div className="error-msg">{error}</div>}

          <button className="btn btn-primario" type="submit" disabled={cargando}>
            {cargando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="config-url">
          Dirección del servidor (IP de la VM)
          <input value={url} onChange={(e) => setUrl(e.target.value)} onBlur={guardarUrl} />
        </div>
      </div>
    </div>
  )
}
