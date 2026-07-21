import * as SecureStore from 'expo-secure-store'

const CLAVE_BASE_URL = 'tienda_base_url'
const CLAVE_ACCESS = 'tienda_access_token'
const CLAVE_REFRESH = 'tienda_refresh_token'
const CLAVE_USERNAME = 'tienda_username'

// URL por default para desarrollo: la IP de la VM de Django en la red local.
// Se cambia desde la pantalla de "Configuración del servidor" en la app.
const URL_POR_DEFAULT = 'http://192.168.0.37:8000'

// Se llama una vez desde AuthContext al arrancar la app, para que api.js
// pueda avisarle a AuthContext cuando la sesión se cae (token vencido y
// el refresh también falla), sin que api.js dependa directamente de
// React ni de la navegación.
let alSesionExpirada = null
export function registrarCallbackSesionExpirada(fn) {
  alSesionExpirada = fn
}

export async function getBaseUrl() {
  const guardada = await SecureStore.getItemAsync(CLAVE_BASE_URL)
  return guardada || URL_POR_DEFAULT
}

export async function setBaseUrl(url) {
  await SecureStore.setItemAsync(CLAVE_BASE_URL, url.replace(/\/$/, ''))
}

async function getTokens() {
  const [access, refresh] = await Promise.all([
    SecureStore.getItemAsync(CLAVE_ACCESS),
    SecureStore.getItemAsync(CLAVE_REFRESH),
  ])
  return { access, refresh }
}

async function setTokens({ access, refresh }) {
  if (access) await SecureStore.setItemAsync(CLAVE_ACCESS, access)
  if (refresh) await SecureStore.setItemAsync(CLAVE_REFRESH, refresh)
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(CLAVE_ACCESS),
    SecureStore.deleteItemAsync(CLAVE_REFRESH),
    SecureStore.deleteItemAsync(CLAVE_USERNAME),
  ])
}

export async function estaAutenticado() {
  const { access } = await getTokens()
  return !!access
}

async function refrescarToken() {
  const { refresh } = await getTokens()
  if (!refresh) return false

  try {
    const baseUrl = await getBaseUrl()
    const resp = await fetch(`${baseUrl}/api/login/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!resp.ok) return false
    const data = await resp.json()
    await setTokens({ access: data.access })
    return true
  } catch {
    return false
  }
}

/**
 * Cliente HTTP genérico hacia la API de Django. Mismo patrón que el panel
 * web (api.js de frontend-admin): agrega el JWT, reintenta una vez con
 * refresh token si el access expiró, y lanza Error con `.status`/`.data`
 * si algo sale mal.
 */
export async function api(path, { method = 'GET', body = null, isFormData = false, _retry = false } = {}) {
  const baseUrl = await getBaseUrl()
  const { access } = await getTokens()

  const headers = {}
  if (access) headers['Authorization'] = `Bearer ${access}`
  if (!isFormData) headers['Content-Type'] = 'application/json'

  let resp
  try {
    resp = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : null,
    })
  } catch (err) {
    const error = new Error(
      'No se pudo conectar con el servidor. Revisa tu conexión o la IP configurada.'
    )
    error.esErrorDeRed = true
    throw error
  }

  if (resp.status === 401 && !_retry) {
    const refrescado = await refrescarToken()
    if (refrescado) {
      return api(path, { method, body, isFormData, _retry: true })
    }
    await clearSession()
    if (alSesionExpirada) alSesionExpirada()
    const error = new Error('Tu sesión expiró. Inicia sesión de nuevo.')
    error.sesionExpirada = true
    throw error
  }

  let data = null
  const texto = await resp.text()
  if (texto) {
    try { data = JSON.parse(texto) } catch { data = texto }
  }

  if (!resp.ok) {
    const mensaje = (data && (data.detail || data.error || JSON.stringify(data))) || `Error ${resp.status}`
    const error = new Error(mensaje)
    error.status = resp.status
    error.data = data
    throw error
  }

  return data
}

export async function login(username, password) {
  const baseUrl = await getBaseUrl()
  let resp
  try {
    resp = await fetch(`${baseUrl}/api/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión o la IP configurada.')
  }

  if (!resp.ok) {
    throw new Error('Usuario o contraseña incorrectos')
  }
  const data = await resp.json()
  await setTokens(data)

  const perfil = await api('/api/mi-perfil/')
  await SecureStore.setItemAsync(CLAVE_USERNAME, perfil.username)
  return perfil
}

export async function registro(username, email, password) {
  const baseUrl = await getBaseUrl()
  let resp
  try {
    resp = await fetch(`${baseUrl}/api/registro/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión o la IP configurada.')
  }

  const texto = await resp.text()
  let data = null
  if (texto) {
    try { data = JSON.parse(texto) } catch { data = texto }
  }

  if (!resp.ok) {
    const mensaje = (data && (data.detail || data.error || Object.values(data || {})[0])) || 'No se pudo crear la cuenta'
    throw new Error(Array.isArray(mensaje) ? mensaje[0] : String(mensaje))
  }
  return data
}

export async function logout() {
  await clearSession()
}
