// Las imágenes de producto ya llegan como URL absoluta desde Django (DRF
// arma la URL completa cuando el serializer tiene acceso al `request`).
// Este helper es solo un respaldo por si algún día llegara relativa.
export function resolverUrlImagen(urlOParcial, baseUrl) {
  if (!urlOParcial) return null
  if (urlOParcial.startsWith('http://') || urlOParcial.startsWith('https://')) return urlOParcial
  return `${baseUrl}${urlOParcial}`
}

export function imagenPrincipal(producto, baseUrl) {
  if (!producto?.imagenes?.length) return null
  const principal = producto.imagenes.find((i) => i.es_principal) || producto.imagenes[0]
  return resolverUrlImagen(principal.imagen, baseUrl)
}
