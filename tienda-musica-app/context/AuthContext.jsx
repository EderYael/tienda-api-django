import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as api from '../utils/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // null = todavía cargando el estado guardado; false = invitado; objeto = logueado
  const [usuario, setUsuario] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  // Se incrementa SOLO cuando la sesión se cae sola (token vencido + refresh
  // fallido) — nunca en un cierre de sesión manual. Sirve para mostrar un
  // aviso distinto ("tu sesión expiró") sin confundirlo con un logout normal.
  const [sesionExpiroCounter, setSesionExpiroCounter] = useState(0)

  const cerrarSesionLocal = useCallback(() => {
    setUsuario(false)
    setSesionExpiroCounter((c) => c + 1)
  }, [])

  useEffect(() => {
    // Le avisa a api.js cómo limpiar el estado de React cuando el
    // refresh token también falla (sesión realmente vencida).
    api.registrarCallbackSesionExpirada(cerrarSesionLocal)

    async function cargarSesionGuardada() {
      const autenticado = await api.estaAutenticado()
      if (!autenticado) {
        setUsuario(false)
        setCargandoSesion(false)
        return
      }
      try {
        const perfil = await api.api('/api/mi-perfil/')
        setUsuario(perfil)
      } catch {
        setUsuario(false)
      } finally {
        setCargandoSesion(false)
      }
    }
    cargarSesionGuardada()
  }, [cerrarSesionLocal])

  async function iniciarSesion(username, password) {
    const perfil = await api.login(username, password)
    setUsuario(perfil)
    return perfil
  }

  async function crearCuenta(username, email, password) {
    await api.registro(username, email, password)
    // Tras registrarse, inicia sesión automáticamente
    return iniciarSesion(username, password)
  }

  async function cerrarSesion() {
    await api.logout()
    setUsuario(false)
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargandoSesion,
        sesionExpiroCounter,
        esInvitado: usuario === false,
        estaLogueado: !!usuario,
        iniciarSesion,
        crearCuenta,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
