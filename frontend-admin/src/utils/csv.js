// Exporta un arreglo de objetos a un archivo CSV descargable.
// columnas: [{ titulo: 'Nombre', valor: 'nombre' | (fila) => valor }]
export function exportarCSV(filas, columnas, nombreArchivo) {
  const encabezado = columnas.map((c) => `"${c.titulo}"`).join(',')
  const cuerpo = filas
    .map((fila) =>
      columnas
        .map((c) => {
          const valor = typeof c.valor === 'function' ? c.valor(fila) : fila[c.valor]
          return `"${String(valor ?? '').replace(/"/g, '""')}"`
        })
        .join(',')
    )
    .join('\n')

  // BOM al inicio para que Excel lea bien los acentos en UTF-8
  const contenido = `\uFEFF${encabezado}\n${cuerpo}`
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}
