import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import { Search, ArrowRight, Package, Users, Truck, ShoppingCart, ShoppingBag, LayoutDashboard, Wallet, LineChart, Settings, Lock, Receipt } from 'lucide-react'
import { useStore } from '@/store/useStore.js'
import { cn } from '@/lib/utils.js'
import { money } from '@/lib/format.js'

const routes = [
  { kind: 'page', label: 'Dashboard',   icon: LayoutDashboard, to: '/' },
  { kind: 'page', label: 'Ventas',      icon: ShoppingCart,    to: '/ventas' },
  { kind: 'page', label: 'Compras',     icon: ShoppingBag,     to: '/compras' },
  { kind: 'page', label: 'Productos',   icon: Package,         to: '/productos' },
  { kind: 'page', label: 'Clientes',    icon: Users,           to: '/clientes' },
  { kind: 'page', label: 'Proveedores', icon: Truck,           to: '/proveedores' },
  { kind: 'page', label: 'Caja',        icon: Wallet,          to: '/caja' },
  { kind: 'page', label: 'Reportes',    icon: LineChart,       to: '/reportes' },
  { kind: 'page', label: 'Ajustes',     icon: Settings,        to: '/ajustes' },
]

const acciones = [
  { kind: 'acción', label: 'Nueva venta',     icon: ShoppingCart, to: '/ventas',  hint: 'POS' },
  { kind: 'acción', label: 'Nueva compra',    icon: ShoppingBag,  to: '/compras', hint: 'a proveedor' },
  { kind: 'acción', label: 'Cerrar caja',     icon: Lock,         to: '/caja',    hint: 'arqueo Z' },
  { kind: 'acción', label: 'Ver reportes',    icon: Receipt,      to: '/reportes' },
]

export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef(null)
  const productos = useStore(s => s.productos)
  const personas = useStore(s => s.personas)

  const corpus = useMemo(() => [
    ...routes,
    ...acciones,
    ...productos.map(p => ({ kind: 'producto', label: p.nombre, sku: p.sku, hint: money(p.precio), to: `/productos?q=${encodeURIComponent(p.nombre)}` })),
    ...personas.map(p => ({ kind: p.tipo, label: p.nombre, hint: p.telefono || p.email, to: p.tipo === 'cliente' ? `/clientes?q=${encodeURIComponent(p.nombre)}` : `/proveedores?q=${encodeURIComponent(p.nombre)}` })),
  ], [productos, personas])

  const fuse = useMemo(() => new Fuse(corpus, {
    includeScore: true,
    threshold: 0.35,
    keys: ['label', 'sku', 'hint'],
  }), [corpus])

  const results = useMemo(() => {
    if (!q.trim()) return corpus.slice(0, 8)
    return fuse.search(q).slice(0, 12).map(r => r.item)
  }, [q, fuse, corpus])

  useEffect(() => {
    if (open) {
      setQ('')
      setIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => { setIdx(0) }, [q])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)) }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const r = results[idx]
        if (r) { navigate(r.to); onClose?.() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, idx, navigate, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[55] grid place-items-start p-4 pt-[14vh] anim-fade-in">
      <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink-950)_70%,transparent)] backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elev)] shadow-2xl anim-fade-up">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
          <Search className="size-4 text-[var(--text-subtle)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en todo el sistema…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-subtle)]"
          />
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">ESC</span>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-[var(--text-subtle)]">Sin resultados.</li>
          )}
          {results.map((r, i) => {
            const Icon = r.icon || iconFor(r.kind)
            return (
              <li key={`${r.kind}-${r.label}-${i}`}>
                <button
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => { navigate(r.to); onClose?.() }}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm',
                    i === idx ? 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--text)]'
                              : 'text-[var(--text-muted)] hover:bg-[color-mix(in_oklab,var(--text)_5%,transparent)]'
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', i === idx && 'text-[var(--accent-text)]')} />
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                  {r.hint && <span className="font-mono text-[11px] text-[var(--text-subtle)]">{r.hint}</span>}
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">{r.kind}</span>
                  <ArrowRight className={cn('size-3.5 opacity-0 transition-opacity', i === idx && 'opacity-100')} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function iconFor(kind) {
  switch (kind) {
    case 'producto':   return Package
    case 'cliente':    return Users
    case 'proveedor':  return Truck
    default:           return ArrowRight
  }
}
