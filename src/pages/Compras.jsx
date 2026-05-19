import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Truck, X, Plus, Minus, Banknote, CreditCard, ArrowRight, ArrowDownRight,
  Trash2, Receipt, Sparkles, Package, User,
} from 'lucide-react'
import Fuse from 'fuse.js'
import { useStore } from '@/store/useStore.js'
import { money, dateTime } from '@/lib/format.js'
import { cn } from '@/lib/utils.js'
import { SectionHeader } from '@/components/ui/SectionHeader.jsx'
import { Card, CardBody } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Field, Input, Select, Textarea } from '@/components/ui/Field.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'

const PAGOS = [
  { id: 'efectivo',         label: 'Efectivo',     icon: Banknote },
  { id: 'tarjeta',          label: 'Tarjeta',      icon: CreditCard },
  { id: 'transferencia',    label: 'Transferencia',icon: ArrowRight },
  { id: 'mp',               label: 'Mercado Pago', icon: Sparkles },
  { id: 'cuenta_corriente', label: 'Cta. Corriente', icon: User },
]

export function Compras() {
  const productos = useStore(s => s.productos)
  const personas  = useStore(s => s.personas)
  const registrarCompra = useStore(s => s.registrarCompra)
  const toast = useStore(s => s.pushToast)

  const proveedores = personas.filter(p => p.tipo === 'proveedor')
  const [q, setQ] = useState('')
  const [cart, setCart] = useState([])
  const [proveedorId, setProveedorId] = useState(null)
  const [metodo, setMetodo] = useState('efectivo')
  const [notas, setNotas] = useState('')
  const [ultimaCompra, setUltimaCompra] = useState(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus() }
      if (!inField && e.key.toLowerCase() === 'b') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const fuse = useMemo(() => new Fuse(productos, {
    threshold: 0.33,
    keys: ['nombre', 'sku'],
  }), [productos])

  const grilla = useMemo(() => {
    const arr = q.trim() ? fuse.search(q).map(r => r.item) : productos
    return arr.slice(0, 36)
  }, [q, fuse, productos])

  const total = cart.reduce((s, it) => s + it.cantidad * it.precio_unit, 0)

  const addToCart = (producto) => {
    setCart(prev => {
      const ex = prev.find(it => it.producto_id === producto.id)
      if (ex) {
        return prev.map(it => it.producto_id === producto.id ? { ...it, cantidad: it.cantidad + 1 } : it)
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precio_unit: producto.costo || 0,
        unidad: producto.unidad,
      }]
    })
  }

  const updateQty = (pid, delta) => {
    setCart(prev => prev.flatMap(it => {
      if (it.producto_id !== pid) return [it]
      const next = Math.max(0, it.cantidad + delta)
      if (next === 0) return []
      return [{ ...it, cantidad: next }]
    }))
  }

  const setQtyExact = (pid, val) => {
    const n = Math.max(0, Number(val) || 0)
    setCart(prev => prev.flatMap(it => it.producto_id === pid ? (n === 0 ? [] : [{ ...it, cantidad: n }]) : [it]))
  }

  const setPrecio = (pid, val) => {
    const n = Math.max(0, Number(val) || 0)
    setCart(prev => prev.map(it => it.producto_id === pid ? { ...it, precio_unit: n } : it))
  }

  const removeItem = (pid) => setCart(prev => prev.filter(it => it.producto_id !== pid))

  const reset = () => {
    setCart([])
    setProveedorId(null)
    setNotas('')
    setMetodo('efectivo')
  }

  const [submitting, setSubmitting] = useState(false)
  const confirmar = async () => {
    if (cart.length === 0 || submitting) return
    if (metodo === 'cuenta_corriente' && !proveedorId) {
      toast({ kind: 'warning', title: 'Falta proveedor', message: 'Para cuenta corriente seleccioná un proveedor.' })
      return
    }
    setSubmitting(true)
    try {
      const reg = await registrarCompra({
        proveedor_id: proveedorId,
        items: cart.map(it => ({
          producto_id: it.producto_id,
          nombre: it.nombre,
          cantidad: it.cantidad,
          precio_unit: it.precio_unit,
        })),
        metodo_pago: metodo,
        notas,
      })
      setUltimaCompra({ ...reg, proveedorNombre: proveedores.find(p => p.id === proveedorId)?.nombre })
      reset()
      toast({ kind: 'success', title: `Compra #${reg.id} registrada`, message: money(reg.total) })
    } catch (e) {
      toast({ kind: 'danger', title: 'No se pudo registrar la compra', message: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="Compras"
        title="Compras a proveedores"
        description="Sumá productos, registrá el egreso y actualizá el stock. Atajos: B busca, F2 enfoca búsqueda."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* IZQUIERDA: catálogo */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardBody className="flex flex-wrap items-center gap-3 p-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
                <Input
                  ref={searchRef}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Buscar producto por nombre o SKU…"
                  className="pl-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">F2</span>
              </div>
            </CardBody>
          </Card>

          {grilla.length === 0 ? (
            <EmptyState icon={Package} title="Sin productos" hint="Cargá productos en /productos para poder comprar." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {grilla.map(p => (
                <ProductoTile key={p.id} p={p} onClick={() => addToCart(p)} />
              ))}
            </div>
          )}
        </div>

        {/* DERECHA: lista */}
        <Card className="flex h-fit flex-col lg:sticky lg:top-20">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-[var(--accent-text)]" />
              <h3 className="text-sm font-medium">Compra</h3>
              <Badge tone="neutral">{cart.length}</Badge>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="xs" onClick={reset}>
                <Trash2 className="size-3.5" /> Vaciar
              </Button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">Sumá productos para empezar.</p>
              <p className="mt-1 text-xs text-[var(--text-subtle)]">Tip: presioná <span className="font-mono">B</span> para buscar.</p>
            </div>
          ) : (
            <ul className="max-h-[calc(100vh-460px)] min-h-[120px] overflow-y-auto px-2 py-2">
              {cart.map(it => (
                <li key={it.producto_id} className="grid grid-cols-[1fr_auto] gap-2 rounded-md px-2 py-2 hover:bg-[color-mix(in_oklab,var(--text)_4%,transparent)]">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{it.nombre}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="font-mono text-[10px] text-[var(--text-subtle)]">$</span>
                      <input
                        value={it.precio_unit}
                        onChange={e => setPrecio(it.producto_id, e.target.value)}
                        className="h-6 w-20 rounded border border-[var(--border)] bg-transparent px-1 font-mono text-[11px]"
                      />
                      <span className="font-mono text-[10px] text-[var(--text-subtle)]">· {it.unidad}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => updateQty(it.producto_id, -1)} aria-label="Menos">
                      <Minus className="size-3" />
                    </Button>
                    <input
                      value={it.cantidad}
                      onChange={e => setQtyExact(it.producto_id, e.target.value)}
                      className="h-7 w-10 rounded border border-[var(--border)] bg-transparent text-center font-mono text-sm"
                    />
                    <Button variant="ghost" size="icon-sm" onClick={() => updateQty(it.producto_id, 1)} aria-label="Más">
                      <Plus className="size-3" />
                    </Button>
                    <button onClick={() => removeItem(it.producto_id)} className="ml-1 text-[var(--text-subtle)] hover:text-[var(--color-danger)]" aria-label="Quitar">
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="col-span-2 -mt-1 text-right font-mono text-xs text-[var(--text-muted)]">
                    {money(it.precio_unit * it.cantidad)}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4">
            <Field label="Proveedor" hint="opcional">
              <Select value={proveedorId || ''} onChange={e => setProveedorId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Sin proveedor asociado</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </Field>

            <Field label="Método de pago">
              <div className="grid grid-cols-5 gap-1.5">
                {PAGOS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setMetodo(p.id)}
                    title={p.label}
                    className={cn(
                      'group flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[10px] uppercase tracking-wide transition-colors',
                      metodo === p.id
                        ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] text-[var(--text)]'
                        : 'border-[var(--border)] text-[var(--text-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]'
                    )}
                  >
                    <p.icon className="size-4" />
                    <span className="truncate w-full text-center">{p.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Notas" hint="opcional">
              <Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Nº de remito, detalles…" />
            </Field>

            <div className="flex items-end justify-between gap-3 border-t border-dashed border-[var(--border)] pt-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">A pagar</p>
                <p className="font-mono text-xs text-[var(--text-muted)]">{cart.length} ítem{cart.length === 1 ? '' : 's'}</p>
              </div>
              <p className="display text-4xl text-[var(--accent-text)]">{money(total)}</p>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={cart.length === 0 || submitting}
              onClick={confirmar}
              className="mt-1 w-full"
            >
              <ArrowDownRight className="size-4" />
              {submitting ? 'Registrando…' : 'Confirmar compra'}
            </Button>
          </div>
        </Card>
      </div>

      <CompraModal compra={ultimaCompra} onClose={() => setUltimaCompra(null)} proveedores={proveedores} />
    </div>
  )
}

function ProductoTile({ p, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex h-full flex-col items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/70 p-3 text-left transition-all',
        'hover:border-[var(--accent)] hover:-translate-y-[1px] hover:shadow-[0_8px_20px_-12px_color-mix(in_oklab,var(--accent)_60%,transparent)]',
      )}
    >
      <p className="line-clamp-2 text-sm leading-tight">{p.nombre}</p>
      <p className="font-mono text-[10px] text-[var(--text-subtle)]">{p.sku || '—'}</p>
      <div className="mt-auto flex w-full items-end justify-between">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
          stock {p.stock} {p.unidad}
        </span>
        <span className="display text-xl">{money(p.costo || 0)}</span>
      </div>
    </button>
  )
}

function CompraModal({ compra, onClose, proveedores }) {
  if (!compra) return null
  return (
    <Modal
      open={!!compra}
      onClose={onClose}
      title={`Compra #${compra.id}`}
      subtitle={dateTime(compra.fecha)}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button variant="primary" onClick={() => window.print()}>
            <Receipt className="size-4" /> Imprimir
          </Button>
        </>
      }
    >
      <div className="print-ticket print:bg-white print:text-black">
        <div className="flex flex-col items-center gap-1 border-b border-dashed border-[var(--border)] pb-3 text-center">
          <p className="display text-xl">Comprobante de compra</p>
          <p className="font-mono text-[11px] text-[var(--text-subtle)]">no fiscal</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <span className="text-[var(--text-subtle)]">Fecha</span>
          <span className="text-right font-mono">{dateTime(compra.fecha)}</span>
          <span className="text-[var(--text-subtle)]">Método</span>
          <span className="text-right">{compra.metodo_pago.replace('_', ' ')}</span>
          {compra.proveedor_id && (
            <>
              <span className="text-[var(--text-subtle)]">Proveedor</span>
              <span className="text-right">{compra.proveedorNombre || proveedores.find(p => p.id === compra.proveedor_id)?.nombre || '—'}</span>
            </>
          )}
        </div>
        <table className="mt-4 w-full text-xs">
          <thead>
            <tr className="text-[var(--text-subtle)]">
              <th className="text-left font-normal">Detalle</th>
              <th className="text-right font-normal">Cant.</th>
              <th className="text-right font-normal">P.U.</th>
              <th className="text-right font-normal">Imp.</th>
            </tr>
          </thead>
          <tbody>
            {compra.items.map((it, i) => (
              <tr key={i} className="border-t border-dashed border-[var(--border)]">
                <td className="py-1.5">{it.nombre}</td>
                <td className="py-1.5 text-right font-mono">{it.cantidad}</td>
                <td className="py-1.5 text-right font-mono">{money(it.precio_unit)}</td>
                <td className="py-1.5 text-right font-mono">{money(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 border-t border-dashed border-[var(--border)] pt-3 text-sm">
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[var(--text-subtle)]">Total</span>
            <span className="display text-2xl">{money(compra.total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
