// Generación de PDF de comprobantes — usa jsPDF.
// El ticket se dibuja en una columna angosta sobre una hoja A4, para que
// entre prolijo en cualquier impresora cuando lo manden a imprimir después.
//
// jsPDF se importa de forma diferida (await import) para no inflar el
// bundle inicial: sólo se descarga cuando el usuario exporta un PDF.

import { money, dateTime, dateOnly } from './format.js'

const MX = 20            // margen izquierdo (mm)
const W  = 100           // ancho de la columna del ticket (mm)
const RX = MX + W        // borde derecho de la columna
const CX = MX + W / 2    // centro de la columna

async function nuevoDoc() {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ unit: 'mm', format: 'a4' })
}

// Encabezado común con el nombre y el subtítulo del comprobante.
function encabezado(doc, subtitulo) {
  let y = 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('AGM system', CX, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(subtitulo, CX, y, { align: 'center' })
  doc.setTextColor(0)
  y += 4
  doc.setDrawColor(170)
  doc.line(MX, y, RX, y)
  return y + 7
}

// Fila etiqueta (izquierda) + valor (derecha). Devuelve el nuevo Y.
function fila(doc, y, label, value, opts = {}) {
  doc.setFontSize(opts.size || 9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(opts.muted ? 110 : 0)
  doc.text(label, MX, y)
  doc.setTextColor(0)
  if (opts.bold) doc.setFont('helvetica', 'bold')
  doc.text(String(value), RX, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  return y + (opts.gap || 6)
}

function separador(doc, y) {
  doc.setDrawColor(210)
  doc.line(MX, y, RX, y)
  return y + 6
}

// --- Comprobante de venta ---
export async function ventaTicketPDF(ticket, clientes = []) {
  const doc = await nuevoDoc()
  let y = encabezado(doc, 'Comprobante no fiscal')

  y = fila(doc, y, 'Comprobante', `#${ticket.id}`, { muted: true })
  y = fila(doc, y, 'Fecha', dateTime(ticket.fecha), { muted: true })
  y = fila(doc, y, 'Método de pago', String(ticket.metodo_pago || '').replace('_', ' '), { muted: true })
  if (ticket.cliente_id) {
    const nom = ticket.clienteNombre
      || clientes.find(c => c.id === ticket.cliente_id)?.nombre
      || '—'
    y = fila(doc, y, 'Cliente', nom, { muted: true })
  }
  y = separador(doc, y + 1)

  // Cabecera de la tabla de ítems
  doc.setFontSize(8)
  doc.setTextColor(110)
  doc.text('Detalle', MX, y)
  doc.text('Cant.', MX + 58, y, { align: 'right' })
  doc.text('P.U.',  MX + 78, y, { align: 'right' })
  doc.text('Imp.',  RX, y, { align: 'right' })
  doc.setTextColor(0)
  y += 5

  doc.setFontSize(9)
  ticket.items.forEach(it => {
    doc.text(String(it.nombre).slice(0, 34), MX, y)
    doc.text(String(it.cantidad), MX + 58, y, { align: 'right' })
    doc.text(money(it.precio_unit), MX + 78, y, { align: 'right' })
    doc.text(money(it.subtotal), RX, y, { align: 'right' })
    y += 5.5
  })

  const subtotal = ticket.items.reduce((s, it) => s + it.subtotal, 0)
  y = separador(doc, y + 1)
  y = fila(doc, y, 'Subtotal', money(subtotal), { muted: true })
  if (ticket.descuento > 0) {
    y = fila(doc, y, 'Descuento', `- ${money(ticket.descuento)}`, { muted: true })
  }
  y = fila(doc, y, 'TOTAL', money(ticket.total), { bold: true, size: 12, gap: 11 })

  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('¡Gracias por su compra!', CX, y, { align: 'center' })

  doc.save(`comprobante-${ticket.id}.pdf`)
}

// --- Cierre Z de caja ---
export async function cierreZPDF(cierre) {
  const doc = await nuevoDoc()
  let y = encabezado(doc, 'Cierre Z · no fiscal')

  y = fila(doc, y, 'Cierre', `#${cierre.id}`, { muted: true })
  y = fila(doc, y, 'Día', dateOnly((cierre.dia || '') + 'T00:00:00'), { muted: true })
  y = fila(doc, y, 'Hora', dateTime(cierre.fecha), { muted: true })
  y = separador(doc, y + 1)

  y = fila(doc, y, 'Ingresos totales', money(cierre.ingresos), { muted: true })
  y = fila(doc, y, 'Egresos totales', `- ${money(cierre.egresos)}`, { muted: true })
  y = fila(doc, y, 'Saldo del día', money(cierre.total_esperado), { muted: true })
  y = separador(doc, y + 1)

  y = fila(doc, y, 'Fondo inicial', money(cierre.fondo_inicial), { muted: true })
  y = fila(doc, y, 'Efectivo esperado', money(cierre.efectivo_esperado), { muted: true })
  y = fila(doc, y, 'Efectivo contado', money(cierre.efectivo_contado), { muted: true })
  y = fila(doc, y, 'DIFERENCIA',
    `${cierre.diferencia > 0 ? '+ ' : ''}${money(cierre.diferencia)}`,
    { bold: true, size: 12, gap: 11 })

  if (cierre.notas) {
    doc.setFontSize(8)
    doc.setTextColor(90)
    doc.text(doc.splitTextToSize(cierre.notas, W), MX, y)
  }

  doc.save(`cierre-z-${cierre.id}.pdf`)
}
