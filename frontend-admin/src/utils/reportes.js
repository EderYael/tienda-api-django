import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { LOGO_BASE64_PNG } from './logoBase64.js'

const AZUL_MARCA = [37, 99, 235] // #2563eb, mismo azul de marca en toda la app

function formatoFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatoMoneda(numero) {
  return `$${Number(numero).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function rangoTexto(datos) {
  const partes = []
  if (datos.filtros.desde) partes.push(`Desde: ${formatoFecha(datos.filtros.desde)}`)
  if (datos.filtros.hasta) partes.push(`Hasta: ${formatoFecha(datos.filtros.hasta)}`)
  if (datos.filtros.estado) partes.push(`Estado: ${datos.filtros.estado}`)
  if (datos.filtros.cliente) partes.push(`Cliente: ${datos.filtros.cliente}`)
  return partes.length > 0 ? partes.join('  ·  ') : 'Todo el historial, sin filtros adicionales'
}

/**
 * Construye el documento PDF del reporte y regresa el objeto jsPDF listo
 * (sin descargarlo todavía). Separado de `generarReportePDF` para poder
 * probar la lógica de contenido sin depender de APIs de navegador.
 */
export function construirDocumentoPDF(datos) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const margen = 40
  let y = 50

  // Encabezado con logo
  doc.addImage(LOGO_BASE64_PNG, 'PNG', margen, y - 22, 30, 30)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AZUL_MARCA)
  doc.text('Tienda Música — Reporte de Ventas', margen + 40, y - 2)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Generado el ${formatoFecha(new Date())}`, anchoPagina - margen, y - 8, { align: 'right' })

  y += 20
  doc.setDrawColor(226, 232, 240)
  doc.line(margen, y, anchoPagina - margen, y)
  y += 16

  doc.setFontSize(9.5)
  doc.setTextColor(80)
  doc.text(`Rango del reporte: ${rangoTexto(datos)}`, margen, y)
  y += 24

  // KPIs principales
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30)
  doc.text('Indicadores clave', margen, y)
  y += 8

  autoTable(doc, {
    startY: y,
    margin: { left: margen, right: margen },
    head: [['Ventas totales', 'Pedidos', 'Ticket promedio', 'Unidades vendidas']],
    body: [[
      formatoMoneda(datos.resumen.totalVentas),
      String(datos.resumen.totalPedidos),
      formatoMoneda(datos.resumen.promedio),
      String(datos.resumen.unidadesVendidas),
    ]],
    theme: 'grid',
    headStyles: { fillColor: AZUL_MARCA, fontSize: 9 },
    bodyStyles: { fontSize: 10, halign: 'center' },
  })
  y = doc.lastAutoTable.finalY + 24

  // Distribución por estado
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Pedidos por estado', margen, y)
  y += 8
  autoTable(doc, {
    startY: y,
    margin: { left: margen, right: margen },
    head: [['Estado', 'Cantidad']],
    body: datos.distribucionEstado.map((d) => [d.estado, String(d.cantidad)]),
    theme: 'striped',
    headStyles: { fillColor: AZUL_MARCA, fontSize: 9 },
    bodyStyles: { fontSize: 9.5 },
    columnStyles: { 1: { halign: 'center' } },
  })
  y = doc.lastAutoTable.finalY + 24

  // Top productos
  if (datos.topProductos.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Productos más vendidos', margen, y)
    y += 8
    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      head: [['Producto', 'Unidades vendidas']],
      body: datos.topProductos.map((p) => [p.nombre, String(p.cantidad)]),
      theme: 'striped',
      headStyles: { fillColor: AZUL_MARCA, fontSize: 9 },
      bodyStyles: { fontSize: 9.5 },
      columnStyles: { 1: { halign: 'center' } },
    })
    y = doc.lastAutoTable.finalY + 24
  }

  // Top categorías
  if (datos.topCategorias.length > 0) {
    if (y > 650) { doc.addPage(); y = 50 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Categorías con más ingresos', margen, y)
    y += 8
    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      head: [['Categoría', 'Ingresos']],
      body: datos.topCategorias.map((c) => [c.nombre, formatoMoneda(c.total)]),
      theme: 'striped',
      headStyles: { fillColor: AZUL_MARCA, fontSize: 9 },
      bodyStyles: { fontSize: 9.5 },
      columnStyles: { 1: { halign: 'right' } },
    })
    y = doc.lastAutoTable.finalY + 24
  }

  // Top clientes
  if (datos.topClientes.length > 0) {
    if (y > 600) { doc.addPage(); y = 50 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Mejores clientes', margen, y)
    y += 8
    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      head: [['Usuario', 'Pedidos', 'Total gastado']],
      body: datos.topClientes.map((c) => [c.username, String(c.totalPedidos), formatoMoneda(c.totalGastado)]),
      theme: 'striped',
      headStyles: { fillColor: AZUL_MARCA, fontSize: 9 },
      bodyStyles: { fontSize: 9.5 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
    })
    y = doc.lastAutoTable.finalY + 24
  }

  // Alerta de stock bajo (no depende del rango de fechas: es inventario actual)
  if (datos.productosStockBajo.length > 0) {
    if (y > 600) { doc.addPage(); y = 50 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 83, 9)
    doc.text('Alerta: productos con stock bajo (inventario actual)', margen, y)
    doc.setTextColor(30)
    y += 8
    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      head: [['Producto', 'Stock restante']],
      body: datos.productosStockBajo.map((p) => [p.nombre, String(p.stock)]),
      theme: 'striped',
      headStyles: { fillColor: [217, 119, 6], fontSize: 9 },
      bodyStyles: { fontSize: 9.5 },
      columnStyles: { 1: { halign: 'center' } },
    })
    y = doc.lastAutoTable.finalY + 24
  }

  // Detalle de pedidos
  if (y > 620) { doc.addPage(); y = 50 }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Detalle de pedidos', margen, y)
  y += 8
  autoTable(doc, {
    startY: y,
    margin: { left: margen, right: margen },
    head: [['ID', 'Cliente', 'Fecha', 'Estado', 'Total']],
    body: datos.pedidos.map((p) => [
      `#${p.id}`, p.usuario, formatoFecha(p.fecha), p.estado, formatoMoneda(p.total),
    ]),
    theme: 'grid',
    headStyles: { fillColor: AZUL_MARCA, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 4: { halign: 'right' } },
  })

  const totalPaginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Página ${i} de ${totalPaginas}`, anchoPagina - margen, doc.internal.pageSize.getHeight() - 20, { align: 'right' })
  }

  return doc
}

/**
 * Genera y descarga el reporte de ventas en PDF.
 * `datos` es el objeto construido en Ventas.jsx (ver `construirDatosReporte`).
 */
export function generarReportePDF(datos) {
  const doc = construirDocumentoPDF(datos)
  doc.save(`reporte-ventas-${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Construye el libro de Excel del reporte y regresa el Workbook de ExcelJS
 * listo (sin descargarlo todavía). Separado de `generarReporteExcel` para
 * poder probar la lógica de contenido sin depender de APIs de navegador.
 */
export function construirLibroExcel(datos) {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Tienda Música — Panel Admin'
  libro.created = new Date()

  const estiloEncabezado = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  }

  function agregarHoja(nombre, columnas, filas) {
    const hoja = libro.addWorksheet(nombre)
    hoja.columns = columnas
    hoja.getRow(1).eachCell((celda) => { celda.style = estiloEncabezado })
    filas.forEach((fila) => hoja.addRow(fila))
    hoja.views = [{ state: 'frozen', ySplit: 1 }]
    return hoja
  }

  // Hoja 1: Resumen
  const hojaResumen = libro.addWorksheet('Resumen')
  hojaResumen.mergeCells('A1:B1')
  hojaResumen.getCell('A1').value = 'Tienda Música — Reporte de Ventas'
  hojaResumen.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF2563EB' } }
  hojaResumen.getCell('A2').value = `Generado el ${formatoFecha(new Date())}`
  hojaResumen.getCell('A3').value = `Rango: ${rangoTexto(datos)}`
  hojaResumen.getCell('A3').alignment = { wrapText: true }
  hojaResumen.mergeCells('A3:B3')

  const filasResumen = [
    ['Ventas totales', datos.resumen.totalVentas],
    ['Pedidos', datos.resumen.totalPedidos],
    ['Ticket promedio', datos.resumen.promedio],
    ['Unidades vendidas', datos.resumen.unidadesVendidas],
  ]
  filasResumen.forEach((fila, i) => {
    hojaResumen.getCell(`A${5 + i}`).value = fila[0]
    hojaResumen.getCell(`A${5 + i}`).font = { bold: true }
    hojaResumen.getCell(`B${5 + i}`).value = fila[1]
  })
  hojaResumen.getColumn('A').width = 22
  hojaResumen.getColumn('B').width = 18

  // Intenta insertar el logo; si el navegador no soporta la conversión de
  // imagen a buffer por algún motivo, el reporte se genera igual sin logo.
  try {
    const base64Puro = LOGO_BASE64_PNG.split(',')[1]
    const idImagen = libro.addImage({ base64: `data:image/png;base64,${base64Puro}`, extension: 'png' })
    hojaResumen.addImage(idImagen, { tl: { col: 2.3, row: 0.1 }, ext: { width: 60, height: 60 } })
  } catch (err) {
    console.warn('No se pudo insertar el logo en el Excel:', err)
  }

  // Hoja 2: Pedidos (detalle)
  agregarHoja(
    'Pedidos',
    [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Cliente', key: 'cliente', width: 20 },
      { header: 'Fecha', key: 'fecha', width: 16 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Total', key: 'total', width: 14 },
    ],
    datos.pedidos.map((p) => ({
      id: p.id, cliente: p.usuario, fecha: formatoFecha(p.fecha), estado: p.estado, total: Number(p.total),
    }))
  )

  // Hoja 3: Top productos
  if (datos.topProductos.length > 0) {
    agregarHoja(
      'Top productos',
      [
        { header: 'Producto', key: 'nombre', width: 30 },
        { header: 'Unidades vendidas', key: 'cantidad', width: 20 },
      ],
      datos.topProductos
    )
  }

  // Hoja 4: Top categorías
  if (datos.topCategorias.length > 0) {
    agregarHoja(
      'Top categorías',
      [
        { header: 'Categoría', key: 'nombre', width: 24 },
        { header: 'Ingresos', key: 'total', width: 16 },
      ],
      datos.topCategorias
    )
  }

  // Hoja 5: Top clientes
  if (datos.topClientes.length > 0) {
    agregarHoja(
      'Top clientes',
      [
        { header: 'Usuario', key: 'username', width: 22 },
        { header: 'Pedidos', key: 'totalPedidos', width: 14 },
        { header: 'Total gastado', key: 'totalGastado', width: 18 },
      ],
      datos.topClientes
    )
  }

  // Hoja 6: Stock bajo (inventario actual, no depende del rango de fechas)
  if (datos.productosStockBajo.length > 0) {
    agregarHoja(
      'Stock bajo',
      [
        { header: 'Producto', key: 'nombre', width: 30 },
        { header: 'Stock restante', key: 'stock', width: 18 },
      ],
      datos.productosStockBajo
    )
  }

  return libro
}

/**
 * Genera y descarga el reporte de ventas en Excel (.xlsx), con una hoja por
 * sección para que sea fácil de filtrar/ordenar en Excel real.
 */
export async function generarReporteExcel(datos) {
  const libro = construirLibroExcel(datos)
  const buffer = await libro.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `reporte-ventas-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}
