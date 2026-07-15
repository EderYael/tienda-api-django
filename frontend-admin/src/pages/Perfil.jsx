import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { IconUsers } from '../components/icons.jsx'
import { SkeletonTarjetas } from '../components/Skeleton.jsx'

export default function Perfil() {
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api('/api/mi-perfil/')
      .then((data) => setPerfil(data))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>Mi Perfil</h1>
          <p>Información de tu cuenta de administrador</p>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {cargando ? (
        <SkeletonTarjetas cantidad={1} />
      ) : perfil && (
        <div className="tarjeta perfil-tarjeta">
          <div className="perfil-avatar-grande">
            <IconUsers size={30} />
          </div>
          <div className="perfil-datos">
            <div className="perfil-campo">
              <span className="perfil-etiqueta">Usuario</span>
              <span className="perfil-valor">{perfil.username}</span>
            </div>
            <div className="perfil-campo">
              <span className="perfil-etiqueta">Email</span>
              <span className="perfil-valor">{perfil.email || '—'}</span>
            </div>
            <div className="perfil-campo">
              <span className="perfil-etiqueta">Rol</span>
              <span className="pill pill-ok">{perfil.rol}</span>
            </div>
          </div>
        </div>
      )}

      <p className="perfil-nota">
        Para cambiar tu contraseña o datos, pídele a otro administrador que lo haga desde la sección de Usuarios.
      </p>
    </div>
  )
}
