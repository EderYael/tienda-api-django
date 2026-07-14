const BASE_URL_KEY = 'tienda_admin_base_url'

export function getBaseUrl() {
  return localStorage.getItem(BASE_URL_KEY) || 'http://192.168.1.64:8000'
}

export function setBaseUrl(url) {
  localStorage.setItem(BASE_URL_KEY, url.replace(/\/$/, ''))
}

function getTokens() {
  return {
    access: localStorage.getItem('access'),
    refresh: localStorage.getItem('refresh')
  }
}

function setTokens({ access, refresh }) {
  if (access) localStorage.setItem('access', access)
  if (refresh) localStorage.setItem('refresh', refresh)
}

export function clearSession() {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
}

export function estaAutenticado() {
  return !!getTokens().access
}

async function refrescarToken() {
  const { refresh } = getTokens()
  if (!refresh) return false

  const resp = await fetch(`${getBaseUrl()}/api/login/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh })
  })

  if (!resp.ok) return false
  const data = await resp.json()
  setTokens({ access: data.access })
  return true
}

export async function api(path, { method = 'GET', body = null, isFormData = false, _retry = false } = {}) {
  const { access } = getTokens()
  const headers = {}
  if (access) headers['Authorization'] = `Bearer ${access}`
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const resp = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : null
  })

  if (resp.status === 401 && !_retry) {
    const refrescado = await refrescarToken()
    if (refrescado) {
      return api(path, { method, body, isFormData, _retry: true })
    }
    clearSession()
    window.location.href = '/login'
    throw new Error('Sesión expirada')
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
  const resp = await fetch(`${getBaseUrl()}/api/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!resp.ok) {
    throw new Error('Usuario o contraseña incorrectos')
  }
  const data = await resp.json()
  setTokens(data)

  const perfil = await api('/api/mi-perfil/')
  if (perfil.rol !== 'administrador') {
    clearSession()
    throw new Error('Esta cuenta no tiene rol de administrador')
  }
  localStorage.setItem('username', perfil.username)
  return perfil
}

export function logout() {
  clearSession()
  localStorage.removeItem('username')
}
