// Data layer — wrappers sobre supabase-js.
// Las funciones acá devuelven los objetos ya listos para usar en la UI.
// Si tu .env no tiene credenciales, el store NO debería llamar acá:
// chequea `supabaseEnabled` antes. Igualmente tiramos error claro.

import { supabase, supabaseEnabled } from './supabase.js'

function ensure() {
  if (!supabaseEnabled) throw new Error('Supabase no está configurado en .env')
}

function rethrow(label, error) {
  console.error(`[data] ${label}`, error)
  throw new Error(error.message || error.error_description || `Error en ${label}`)
}

// =====================================================================
// Bootstrap: trae todo lo del usuario logueado en una sola pasada
// =====================================================================
export async function bootstrap() {
  ensure()
  const [cats, prods, pers, ventas, compras, mov] = await Promise.all([
    supabase.from('categorias').select('*').order('id'),
    supabase.from('productos').select('*').order('nombre'),
    supabase.from('personas').select('*').order('nombre'),
    supabase.from('ventas')
      .select('*, items:venta_items(*)')
      .order('fecha', { ascending: false })
      .limit(500),
    supabase.from('compras')
      .select('*, items:compra_items(*)')
      .order('fecha', { ascending: false })
      .limit(500),
    supabase.from('movimientos_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(1000),
  ])
  if (cats.error)    rethrow('bootstrap.categorias', cats.error)
  if (prods.error)   rethrow('bootstrap.productos', prods.error)
  if (pers.error)    rethrow('bootstrap.personas', pers.error)
  if (ventas.error)  rethrow('bootstrap.ventas', ventas.error)
  if (compras.error) rethrow('bootstrap.compras', compras.error)
  if (mov.error)     rethrow('bootstrap.movimientos', mov.error)
  return {
    categorias: cats.data ?? [],
    productos: prods.data ?? [],
    personas: pers.data ?? [],
    ventas: (ventas.data ?? []).map(v => ({ ...v, items: v.items ?? [] })),
    compras: (compras.data ?? []).map(c => ({ ...c, items: c.items ?? [] })),
    movimientosCaja: mov.data ?? [],
  }
}

// =====================================================================
// Categorías
// =====================================================================
export const cat = {
  async upsert(payload) {
    ensure()
    const { id, ...data } = payload
    const q = id
      ? supabase.from('categorias').update(data).eq('id', id).select().single()
      : supabase.from('categorias').insert(data).select().single()
    const { data: row, error } = await q
    if (error) rethrow('cat.upsert', error)
    return row
  },
  async remove(id) {
    ensure()
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) rethrow('cat.remove', error)
  },
}

// =====================================================================
// Productos
// =====================================================================
export const prod = {
  async upsert(payload) {
    ensure()
    const { id, ...data } = payload
    // saneo
    data.precio       = Number(data.precio) || 0
    data.costo        = Number(data.costo)  || 0
    data.stock        = Number(data.stock)  || 0
    data.stock_minimo = Number(data.stock_minimo) || 0
    if (data.sku === '') data.sku = null
    const q = id
      ? supabase.from('productos').update(data).eq('id', id).select().single()
      : supabase.from('productos').insert(data).select().single()
    const { data: row, error } = await q
    if (error) rethrow('prod.upsert', error)
    return row
  },
  async remove(id) {
    ensure()
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) rethrow('prod.remove', error)
  },
  async ajustarStock(id, delta) {
    ensure()
    const { data, error } = await supabase.rpc('app_ajustar_stock', {
      p_producto_id: id,
      p_delta: delta,
    })
    if (error) rethrow('prod.ajustarStock', error)
    return data // nuevo stock
  },
}

// =====================================================================
// Personas (clientes + proveedores)
// =====================================================================
export const per = {
  async upsert(payload) {
    ensure()
    const { id, ...data } = payload
    data.saldo = Number(data.saldo) || 0
    const q = id
      ? supabase.from('personas').update(data).eq('id', id).select().single()
      : supabase.from('personas').insert(data).select().single()
    const { data: row, error } = await q
    if (error) rethrow('per.upsert', error)
    return row
  },
  async remove(id) {
    ensure()
    const { error } = await supabase.from('personas').delete().eq('id', id)
    if (error) rethrow('per.remove', error)
  },
}

// =====================================================================
// Ventas
// =====================================================================
export const venta = {
  async registrar({ items, descuento = 0, metodo_pago = 'efectivo', cliente_id = null, notas = '' }) {
    ensure()
    const { data, error } = await supabase.rpc('app_register_venta', {
      p_items: items.map(it => ({
        producto_id: it.producto_id ?? null,
        nombre: it.nombre,
        cantidad: Number(it.cantidad),
        precio_unit: Number(it.precio_unit),
      })),
      p_descuento: Number(descuento) || 0,
      p_metodo_pago: metodo_pago,
      p_cliente_id: cliente_id,
      p_notas: notas || null,
    })
    if (error) rethrow('venta.registrar', error)
    const v = data.venta
    return { ...v, items: data.items ?? [] }
  },
  async anular(id) {
    ensure()
    const { error } = await supabase.rpc('app_anular_venta', { p_venta_id: id })
    if (error) rethrow('venta.anular', error)
  },
  // Para refrescar después de una operación
  async byId(id) {
    ensure()
    const { data, error } = await supabase
      .from('ventas')
      .select('*, items:venta_items(*)')
      .eq('id', id)
      .single()
    if (error) rethrow('venta.byId', error)
    return data
  },
}

// =====================================================================
// Compras
// =====================================================================
export const compra = {
  async registrar({ items, proveedor_id = null, metodo_pago = 'efectivo', notas = '' }) {
    ensure()
    const { data, error } = await supabase.rpc('app_register_compra', {
      p_items: items.map(it => ({
        producto_id: it.producto_id ?? null,
        nombre: it.nombre,
        cantidad: Number(it.cantidad),
        precio_unit: Number(it.precio_unit),
      })),
      p_proveedor_id: proveedor_id,
      p_metodo_pago: metodo_pago,
      p_notas: notas || null,
    })
    if (error) rethrow('compra.registrar', error)
    const c = data.compra
    return { ...c, items: data.items ?? [] }
  },
}

// =====================================================================
// Pagos a/de personas (cliente o proveedor)
// =====================================================================
export const pago = {
  async registrar({ persona_id, monto, metodo_pago = 'efectivo', notas = '' }) {
    ensure()
    const { error } = await supabase.rpc('app_register_pago_persona', {
      p_persona_id: persona_id,
      p_monto: Number(monto),
      p_metodo_pago: metodo_pago,
      p_notas: notas || null,
    })
    if (error) rethrow('pago.registrar', error)
  },
}

// =====================================================================
// Movimientos de caja
// =====================================================================
export const caja = {
  async registrar(mov) {
    ensure()
    const data = {
      tipo: mov.tipo,
      concepto: mov.concepto,
      monto: Number(mov.monto) || 0,
      metodo_pago: mov.metodo_pago || 'efectivo',
      notas: mov.notas || null,
    }
    const { data: row, error } = await supabase
      .from('movimientos_caja')
      .insert(data)
      .select()
      .single()
    if (error) rethrow('caja.registrar', error)
    return row
  },
}

// =====================================================================
// Vaciar todos los datos del owner actual (RPC atómico).
// =====================================================================
export async function vaciarTodo() {
  ensure()
  const { error } = await supabase.rpc('app_vaciar_datos')
  if (error) rethrow('vaciarTodo', error)
}

// =====================================================================
// Refresh helpers cuando una RPC mutó varias tablas
// =====================================================================
export async function refreshProductosYCaja() {
  ensure()
  const [prods, mov, pers] = await Promise.all([
    supabase.from('productos').select('*').order('nombre'),
    supabase.from('movimientos_caja').select('*').order('fecha', { ascending: false }).limit(1000),
    supabase.from('personas').select('*').order('nombre'),
  ])
  if (prods.error) rethrow('refresh.productos', prods.error)
  if (mov.error)   rethrow('refresh.movimientos', mov.error)
  if (pers.error)  rethrow('refresh.personas', pers.error)
  return { productos: prods.data ?? [], movimientosCaja: mov.data ?? [], personas: pers.data ?? [] }
}
