// Datos iniciales de demo. Se cargan SOLO si el storage local está vacío.
// Sin imágenes — todo texto, según pidió el usuario.

export const seedCategorias = [
  { id: 1, nombre: 'Bebidas',      color: '#74b5f0' },
  { id: 2, nombre: 'Almacén',      color: '#dafe52' },
  { id: 3, nombre: 'Limpieza',     color: '#62d39a' },
  { id: 4, nombre: 'Electrónica',  color: '#f5b94a' },
  { id: 5, nombre: 'Servicios',    color: '#ef6a5a' },
]

export const seedProductos = [
  { id: 101, sku: 'BEB-001', nombre: 'Agua mineral 500ml',    categoria_id: 1, precio: 850,   costo: 510,   stock: 42, stock_minimo: 12, unidad: 'u', activo: true,  descripcion: 'Botella de agua sin gas.' },
  { id: 102, sku: 'BEB-002', nombre: 'Gaseosa cola 1.5L',     categoria_id: 1, precio: 2300,  costo: 1500,  stock: 18, stock_minimo: 8,  unidad: 'u', activo: true,  descripcion: '' },
  { id: 103, sku: 'BEB-003', nombre: 'Cerveza rubia 473ml',   categoria_id: 1, precio: 1900,  costo: 1240,  stock: 6,  stock_minimo: 10, unidad: 'u', activo: true,  descripcion: 'Lata. Stock bajo.' },
  { id: 201, sku: 'ALM-001', nombre: 'Yerba mate 1kg',        categoria_id: 2, precio: 4500,  costo: 3200,  stock: 22, stock_minimo: 6,  unidad: 'u', activo: true,  descripcion: '' },
  { id: 202, sku: 'ALM-002', nombre: 'Azúcar 1kg',            categoria_id: 2, precio: 1450,  costo: 950,   stock: 31, stock_minimo: 10, unidad: 'u', activo: true,  descripcion: '' },
  { id: 203, sku: 'ALM-003', nombre: 'Fideos 500g',           categoria_id: 2, precio: 1100,  costo: 720,   stock: 0,  stock_minimo: 12, unidad: 'u', activo: true,  descripcion: 'Sin stock.' },
  { id: 301, sku: 'LIM-001', nombre: 'Lavandina 1L',          categoria_id: 3, precio: 1250,  costo: 800,   stock: 14, stock_minimo: 5,  unidad: 'u', activo: true,  descripcion: '' },
  { id: 302, sku: 'LIM-002', nombre: 'Detergente 750ml',      categoria_id: 3, precio: 1800,  costo: 1180,  stock: 9,  stock_minimo: 5,  unidad: 'u', activo: true,  descripcion: '' },
  { id: 401, sku: 'ELE-001', nombre: 'Pilas AA x4',           categoria_id: 4, precio: 3200,  costo: 2100,  stock: 24, stock_minimo: 6,  unidad: 'u', activo: true,  descripcion: '' },
  { id: 402, sku: 'ELE-002', nombre: 'Cargador USB-C 20W',    categoria_id: 4, precio: 14500, costo: 9800,  stock: 4,  stock_minimo: 3,  unidad: 'u', activo: true,  descripcion: '' },
  { id: 501, sku: 'SRV-001', nombre: 'Instalación a domicilio', categoria_id: 5, precio: 12000, costo: 0,    stock: 999, stock_minimo: 0, unidad: 'srv', activo: true, descripcion: 'No descuenta stock.' },
]

export const seedPersonas = [
  { id: 1001, tipo: 'cliente',    nombre: 'María González',  documento: '30.421.882', telefono: '11 5432-1100', email: 'maria@example.com',  direccion: 'Av. Rivadavia 1234', notas: 'Cliente frecuente', saldo: 0 },
  { id: 1002, tipo: 'cliente',    nombre: 'Juan Pérez',      documento: '28.110.554', telefono: '11 4123-5588', email: '',                   direccion: '',                    notas: '',                     saldo: -3500 },
  { id: 1003, tipo: 'cliente',    nombre: 'Lucía Fernández', documento: '',          telefono: '',             email: 'lu.fdz@example.com', direccion: '',                    notas: 'Mayorista',           saldo: 0 },
  { id: 2001, tipo: 'proveedor',  nombre: 'Distribuidora Norte SA', documento: 'CUIT 30-71234567-8', telefono: '11 4321-9988', email: 'ventas@dnorte.com', direccion: 'Parque Industrial', notas: 'Entrega martes y viernes', saldo: 0 },
  { id: 2002, tipo: 'proveedor',  nombre: 'Bebidas Cuyo',    documento: 'CUIT 30-70999111-2', telefono: '',             email: '', direccion: 'Mendoza', notas: '', saldo: 0 },
]

export const seedVentas = (() => {
  const now = Date.now()
  const day = 86400000
  const out = []
  let id = 5000
  for (let i = 0; i < 14; i++) {
    const fecha = new Date(now - i * day - Math.random() * day).toISOString()
    const items = [
      { producto_id: 101, nombre: 'Agua mineral 500ml', cantidad: 1 + Math.floor(Math.random() * 4), precio_unit: 850 },
      { producto_id: 202, nombre: 'Azúcar 1kg',         cantidad: 1 + Math.floor(Math.random() * 2), precio_unit: 1450 },
    ].map(it => ({ ...it, subtotal: it.cantidad * it.precio_unit }))
    const subtotal = items.reduce((s, it) => s + it.subtotal, 0)
    out.push({
      id: id++,
      cliente_id: i % 3 === 0 ? 1001 : null,
      fecha,
      subtotal,
      descuento: 0,
      total: subtotal,
      metodo_pago: ['efectivo','tarjeta','transferencia','mp'][i % 4],
      estado: 'completada',
      notas: '',
      items,
    })
  }
  return out
})()

export const seedMovimientosCaja = [
  { id: 9001, fecha: new Date().toISOString(), tipo: 'ingreso', concepto: 'Apertura de caja', monto: 20000, metodo_pago: 'efectivo', venta_id: null, notas: '' },
]
