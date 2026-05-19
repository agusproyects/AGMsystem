import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabaseEnabled } from '@/lib/supabase.js'
import * as data from '@/lib/data.js'
import {
  seedCategorias,
  seedProductos,
  seedPersonas,
  seedVentas,
  seedMovimientosCaja,
} from './seed.js'

let counter = Date.now()
const nextId = () => ++counter

// Si Supabase está habilitado, no usamos seeds — el bootstrap los pisa.
const initialData = supabaseEnabled
  ? { categorias: [], productos: [], personas: [], ventas: [], movimientosCaja: [] }
  : {
      categorias: seedCategorias,
      productos: seedProductos,
      personas: seedPersonas,
      ventas: seedVentas,
      movimientosCaja: seedMovimientosCaja,
    }

export const useStore = create(
  persist(
    (set, get) => ({
      // -------- Datos --------
      ...initialData,

      // -------- Bootstrap --------
      dataLoaded: !supabaseEnabled,   // en local arrancamos "cargado"
      bootstrapping: false,
      bootstrapError: null,

      bootstrap: async () => {
        if (!supabaseEnabled) {
          set({ dataLoaded: true })
          return
        }
        set({ bootstrapping: true, bootstrapError: null })
        try {
          const all = await data.bootstrap()
          set({
            categorias: all.categorias,
            productos: all.productos,
            personas: all.personas,
            ventas: all.ventas,
            movimientosCaja: all.movimientosCaja,
            dataLoaded: true,
            bootstrapping: false,
          })
        } catch (e) {
          set({ bootstrapError: e.message, bootstrapping: false })
        }
      },

      resetClientCache: () => set({
        ...(supabaseEnabled
          ? { categorias: [], productos: [], personas: [], ventas: [], movimientosCaja: [], dataLoaded: false }
          : {}),
      }),

      // -------- UI --------
      theme: 'dark',
      sidebarCollapsed: false,
      toasts: [],

      // -------- Sesión --------
      session: null,
      setSession: (s) => set({ session: s }),
      clearSession: () => set({ session: null }),

      setTheme: (theme) => {
        document.documentElement.dataset.theme = theme
        set({ theme })
      },
      toggleTheme: () => {
        const t = get().theme === 'dark' ? 'light' : 'dark'
        document.documentElement.dataset.theme = t
        set({ theme: t })
      },
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      pushToast: (toast) => {
        const id = nextId()
        const t = { id, kind: 'info', ttl: 3200, ...toast }
        set(s => ({ toasts: [...s.toasts, t] }))
        setTimeout(() => get().dismissToast(id), t.ttl)
      },
      dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

      // ===========================================================
      // Categorías
      // ===========================================================
      upsertCategoria: async (cat) => {
        if (supabaseEnabled) {
          const row = await data.cat.upsert(cat)
          set(s => ({
            categorias: cat.id
              ? s.categorias.map(c => c.id === row.id ? row : c)
              : [...s.categorias, row],
          }))
          return row
        }
        if (cat.id) {
          set(s => ({ categorias: s.categorias.map(c => c.id === cat.id ? { ...c, ...cat } : c) }))
        } else {
          set(s => ({ categorias: [...s.categorias, { ...cat, id: nextId() }] }))
        }
      },
      removeCategoria: async (id) => {
        if (supabaseEnabled) {
          await data.cat.remove(id)
        }
        set(s => ({
          categorias: s.categorias.filter(c => c.id !== id),
          productos: s.productos.map(p => p.categoria_id === id ? { ...p, categoria_id: null } : p),
        }))
      },

      // ===========================================================
      // Productos
      // ===========================================================
      upsertProducto: async (prod) => {
        if (supabaseEnabled) {
          const row = await data.prod.upsert(prod)
          set(s => ({
            productos: prod.id
              ? s.productos.map(p => p.id === row.id ? row : p)
              : [...s.productos, row],
          }))
          return row
        }
        if (prod.id) {
          set(s => ({ productos: s.productos.map(p => p.id === prod.id ? { ...p, ...prod } : p) }))
        } else {
          set(s => ({ productos: [...s.productos, { ...prod, id: nextId(), activo: prod.activo ?? true }] }))
        }
      },
      removeProducto: async (id) => {
        if (supabaseEnabled) {
          await data.prod.remove(id)
        }
        set(s => ({ productos: s.productos.filter(p => p.id !== id) }))
      },
      ajustarStock: async (id, delta, motivo = '') => {
        if (supabaseEnabled) {
          const newStock = await data.prod.ajustarStock(id, delta)
          set(s => ({
            productos: s.productos.map(p => p.id === id ? { ...p, stock: newStock } : p),
          }))
          return
        }
        set(s => ({
          productos: s.productos.map(p =>
            p.id === id ? { ...p, stock: Math.max(0, (p.stock || 0) + delta) } : p
          ),
          movimientosCaja: motivo
            ? [...s.movimientosCaja, {
                id: nextId(),
                fecha: new Date().toISOString(),
                tipo: delta > 0 ? 'egreso' : 'ingreso',
                concepto: `Ajuste stock: ${motivo}`,
                monto: 0,
                metodo_pago: 'n/a',
                venta_id: null,
                notas: '',
              }]
            : s.movimientosCaja,
        }))
      },

      // ===========================================================
      // Personas
      // ===========================================================
      upsertPersona: async (per) => {
        if (supabaseEnabled) {
          const row = await data.per.upsert(per)
          set(s => ({
            personas: per.id
              ? s.personas.map(p => p.id === row.id ? row : p)
              : [...s.personas, row],
          }))
          return row
        }
        if (per.id) {
          set(s => ({ personas: s.personas.map(p => p.id === per.id ? { ...p, ...per } : p) }))
        } else {
          set(s => ({ personas: [...s.personas, { ...per, id: nextId(), saldo: per.saldo ?? 0 }] }))
        }
      },
      removePersona: async (id) => {
        if (supabaseEnabled) {
          await data.per.remove(id)
        }
        set(s => ({ personas: s.personas.filter(p => p.id !== id) }))
      },

      // ===========================================================
      // Ventas
      // ===========================================================
      registrarVenta: async (venta) => {
        if (supabaseEnabled) {
          const reg = await data.venta.registrar(venta)
          // Refrescar productos, caja y personas que se vieron afectados
          const fresh = await data.refreshProductosYCaja()
          set(s => ({
            ventas: [reg, ...s.ventas],
            productos: fresh.productos,
            movimientosCaja: fresh.movimientosCaja,
            personas: fresh.personas,
          }))
          return reg
        }

        // ----- Local fallback -----
        const id = nextId()
        const itemsCalc = venta.items.map(it => ({
          ...it,
          subtotal: Number((it.cantidad * it.precio_unit).toFixed(2)),
        }))
        const subtotal = itemsCalc.reduce((s, it) => s + it.subtotal, 0)
        const descuento = Number(venta.descuento || 0)
        const total = Math.max(0, subtotal - descuento)
        const fecha = new Date().toISOString()
        const reg = {
          id, cliente_id: venta.cliente_id || null, fecha, subtotal, descuento, total,
          metodo_pago: venta.metodo_pago || 'efectivo', estado: 'completada',
          notas: venta.notas || '', items: itemsCalc,
        }
        set(s => {
          const productos = s.productos.map(p => {
            const used = itemsCalc.filter(it => it.producto_id === p.id)
                                  .reduce((sum, it) => sum + Number(it.cantidad), 0)
            return used ? { ...p, stock: Math.max(0, (p.stock || 0) - used) } : p
          })
          const movimientosCaja = [...s.movimientosCaja, {
            id: nextId(),
            fecha,
            tipo: 'ingreso',
            concepto: `Venta #${id}`,
            monto: total,
            metodo_pago: reg.metodo_pago,
            venta_id: id,
            notas: '',
          }]
          let personas = s.personas
          if (reg.metodo_pago === 'cuenta_corriente' && reg.cliente_id) {
            personas = personas.map(p =>
              p.id === reg.cliente_id ? { ...p, saldo: (p.saldo || 0) - total } : p
            )
          }
          return { ventas: [reg, ...s.ventas], productos, movimientosCaja, personas }
        })
        return reg
      },

      anularVenta: async (id) => {
        if (supabaseEnabled) {
          await data.venta.anular(id)
          const venta = await data.venta.byId(id)
          const fresh = await data.refreshProductosYCaja()
          set(s => ({
            ventas: s.ventas.map(v => v.id === id ? venta : v),
            productos: fresh.productos,
            movimientosCaja: fresh.movimientosCaja,
            personas: fresh.personas,
          }))
          return
        }

        // ----- Local fallback -----
        const venta = get().ventas.find(v => v.id === id)
        if (!venta || venta.estado === 'anulada') return
        set(s => {
          const productos = s.productos.map(p => {
            const back = venta.items.filter(it => it.producto_id === p.id)
                                    .reduce((sum, it) => sum + Number(it.cantidad), 0)
            return back ? { ...p, stock: (p.stock || 0) + back } : p
          })
          const movimientosCaja = [...s.movimientosCaja, {
            id: nextId(),
            fecha: new Date().toISOString(),
            tipo: 'egreso',
            concepto: `Anulación venta #${id}`,
            monto: venta.total,
            metodo_pago: venta.metodo_pago,
            venta_id: id,
            notas: '',
          }]
          let personas = s.personas
          if (venta.metodo_pago === 'cuenta_corriente' && venta.cliente_id) {
            personas = personas.map(p =>
              p.id === venta.cliente_id ? { ...p, saldo: (p.saldo || 0) + venta.total } : p
            )
          }
          return {
            ventas: s.ventas.map(v => v.id === id ? { ...v, estado: 'anulada' } : v),
            productos,
            movimientosCaja,
            personas,
          }
        })
      },

      // ===========================================================
      // Caja
      // ===========================================================
      registrarMovimientoCaja: async (mov) => {
        if (supabaseEnabled) {
          const row = await data.caja.registrar(mov)
          set(s => ({ movimientosCaja: [row, ...s.movimientosCaja] }))
          return row
        }
        set(s => ({
          movimientosCaja: [...s.movimientosCaja, {
            id: nextId(),
            fecha: new Date().toISOString(),
            tipo: mov.tipo,
            concepto: mov.concepto,
            monto: Number(mov.monto) || 0,
            metodo_pago: mov.metodo_pago || 'efectivo',
            venta_id: null,
            notas: mov.notas || '',
          }],
        }))
      },

      // ===========================================================
      // Reset / wipe (sólo local)
      // ===========================================================
      resetTodo: () => {
        if (supabaseEnabled) return  // en Supabase no aplica
        set({
          categorias: seedCategorias,
          productos: seedProductos,
          personas: seedPersonas,
          ventas: seedVentas,
          movimientosCaja: seedMovimientosCaja,
        })
      },
      vaciarDatos: () => set({
        categorias: [],
        productos: [],
        personas: [],
        ventas: [],
        movimientosCaja: [],
      }),
    }),
    {
      name: 'agm-system-v1',
      version: 2,
      partialize: (state) => ({
        // En modo Supabase NO persistimos los datos (vienen del bootstrap),
        // sólo UI / sesión. Evita conflicto entre cache local y servidor.
        ...(supabaseEnabled
          ? {}
          : {
              categorias: state.categorias,
              productos: state.productos,
              personas: state.personas,
              ventas: state.ventas,
              movimientosCaja: state.movimientosCaja,
            }),
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        session: state.session,
      }),
    }
  )
)

// Selectores derivados (helpers)
export const useDerived = () => {
  const s = useStore()
  const productos = s.productos
  const ventas = s.ventas.filter(v => v.estado === 'completada')
  const stockBajo = productos.filter(p => p.activo && p.stock <= p.stock_minimo)
  const valorInventario = productos.reduce((sum, p) => sum + (p.stock || 0) * (p.costo || 0), 0)

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy)
  const ventasMes = ventas.filter(v => new Date(v.fecha) >= inicioMes)
  const totalHoy = ventasHoy.reduce((s, v) => s + v.total, 0)
  const totalMes = ventasMes.reduce((s, v) => s + v.total, 0)

  const ticketProm = ventasMes.length ? totalMes / ventasMes.length : 0

  const acc = new Map()
  ventasMes.forEach(v => (v.items || []).forEach(it => {
    const cur = acc.get(it.nombre) || { nombre: it.nombre, cantidad: 0, total: 0 }
    cur.cantidad += Number(it.cantidad) || 0
    cur.total += Number(it.subtotal) || 0
    acc.set(it.nombre, cur)
  }))
  const topProductos = Array.from(acc.values()).sort((a, b) => b.total - a.total).slice(0, 6)

  const serie = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoy); d.setDate(d.getDate() - i)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const tot = ventas
      .filter(v => { const f = new Date(v.fecha); return f >= d && f < next })
      .reduce((sum, v) => sum + v.total, 0)
    serie.push({ dia: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), total: tot })
  }

  const ingresos = s.movimientosCaja.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const egresos  = s.movimientosCaja.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  const saldoCaja = ingresos - egresos

  return {
    stockBajo, valorInventario, ventasHoy, totalHoy, totalMes, ticketProm,
    topProductos, serie, ingresos, egresos, saldoCaja,
  }
}
