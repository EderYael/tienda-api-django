import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, getBaseUrl, setBaseUrl } from '../api.js'
import LogoBolsaSonido from '../components/Logo.jsx'
import Spinner from '../components/Spinner.jsx'
import { IconEye, IconEyeOff, IconSettings } from '../components/icons.jsx'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [url, setUrl] = useState(getBaseUrl())
  const [mostrarConfig, setMostrarConfig] = useState(false)
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
      <div className="login-tarjeta">

        {/* LADO IZQUIERDO: Banner con degradado */}
        <div className="login-lateral-izquierdo">
          <LogoBolsaSonido size={44} color="white" grosor={4.5} className="login-marca-lateral" />
          <div className="lateral-texto-contenedor">
            <span className="lateral-subtitulo">Tienda de Música — Panel Admin</span>
            <h2 className="lateral-titulo">
              Gestiona tu catálogo al ritmo del negocio
            </h2>
            <p className="lateral-descripcion">
              Instrumentos, vinilos y equipo de audio: controla inventario, pedidos y
              usuarios desde un solo lugar.
            </p>
          </div>
        </div>

        {/* LADO DERECHO: Formulario de acceso */}
        <div className="login-lateral-derecho">
          <div className="login-marca-form">
            <LogoBolsaSonido size={38} color="currentColor" grosor={5} />
          </div>

          <h1 className="formulario-titulo">Bienvenido de nuevo</h1>
          <p className="formulario-subtitulo">
            Inicia sesión para administrar la tienda.
          </p>

          <form onSubmit={manejarSubmit} className="login-formulario">
            <div className="campo-grupo">
              <label htmlFor="usuario">Usuario</label>
              <input
                id="usuario"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                autoFocus
                required
              />
            </div>

            <div className="campo-grupo">
              <label htmlFor="contrasena">Contraseña</label>
              <div className="password-wrapper">
                <input
                  id="contrasena"
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                </button>
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button className="btn-entrar" type="submit" disabled={cargando}>
              {cargando ? <Spinner size={15} /> : null}
              {cargando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="config-url-seccion">
            <button
              type="button"
              className="config-url-disparador"
              onClick={() => setMostrarConfig(!mostrarConfig)}
            >
              <IconSettings size={13} />
              Configuración del servidor
            </button>

            {mostrarConfig && (
              <div className="config-url-cuerpo">
                <div className="campo-grupo">
                  <label htmlFor="servidor-ip">Dirección del servidor (IP de la VM)</label>
                  <input
                    id="servidor-ip"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={guardarUrl}
                    placeholder="http://192.168.x.x:8000"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
