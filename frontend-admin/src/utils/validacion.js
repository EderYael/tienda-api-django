const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarProducto(form) {
  const errores = {}
  if (!form.nombre.trim()) errores.nombre = 'El nombre es obligatorio'

  if (!form.categoria) errores.categoria = 'Selecciona una categoría'

  if (form.precio === '' || form.precio === null) {
    errores.precio = 'Ingresa un precio'
  } else if (isNaN(parseFloat(form.precio)) || parseFloat(form.precio) <= 0) {
    errores.precio = 'El precio debe ser mayor a 0'
  }

  if (form.stock === '' || form.stock === null) {
    errores.stock = 'Ingresa el stock'
  } else if (isNaN(parseInt(form.stock, 10)) || parseInt(form.stock, 10) < 0) {
    errores.stock = 'El stock no puede ser negativo'
  }

  return errores
}

export function validarCategoria(nombre) {
  const errores = {}
  if (!nombre.trim()) errores.nombre = 'El nombre es obligatorio'
  return errores
}

export function validarUsuario(form, esNuevo) {
  const errores = {}
  if (!form.username.trim()) errores.username = 'El usuario es obligatorio'
  if (form.email && !REGEX_EMAIL.test(form.email)) errores.email = 'Ingresa un email válido'

  if (esNuevo && (!form.password || form.password.length < 8)) {
    errores.password = 'Mínimo 8 caracteres'
  } else if (!esNuevo && form.password && form.password.length < 8) {
    errores.password = 'Mínimo 8 caracteres (o déjalo vacío)'
  }

  return errores
}

// Convierte errores de DRF ({campo: ["mensaje"]} o {campo: "mensaje"}) a un objeto plano
export function erroresDeApi(data) {
  if (!data || typeof data !== 'object') return {}
  const out = {}
  for (const [campo, valor] of Object.entries(data)) {
    if (Array.isArray(valor)) out[campo] = valor.join(' ')
    else if (typeof valor === 'string') out[campo] = valor
  }
  return out
}
