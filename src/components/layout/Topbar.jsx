import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, CircleDot, WifiOff, Menu } from 'lucide-react'
import { supabaseEnabled } from '@/lib/supabase.js'
import { Button } from '@/components/ui/Button.jsx'

function useClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return t
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  useEffect(() => {
    const up   = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

export function Topbar({ onOpenSearch, onOpenMobileNav }) {
  const navigate = useNavigate()
  const now = useClock()
  const online = useOnline()
  const hora = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const fecha = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/85 px-3 backdrop-blur-md sm:gap-3 sm:px-6">
      <button
        onClick={onOpenMobileNav}
        className="grid size-9 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] md:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-4" />
      </button>
      <button
        onClick={onOpenSearch}
        className="group flex h-9 min-w-0 flex-1 max-w-[420px] items-center gap-2.5 rounded-md border border-[var(--border)] bg-[var(--bg-elev)] px-3 text-sm text-[var(--text-subtle)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]"
      >
        <Search className="size-4" />
        <span className="truncate"><span className="hidden sm:inline">Buscar productos, clientes, ventas…</span><span className="sm:hidden">Buscar…</span></span>
        <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-wider text-[var(--text-subtle)] sm:inline">⌘ K</span>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden flex-col items-end text-right md:flex">
          <span className="text-xs text-[var(--text-muted)] first-letter:uppercase">{fecha}</span>
          <span className="font-mono text-[11px] text-[var(--text-subtle)]">{hora}</span>
        </div>

        {!online && (
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-warning)] bg-[color-mix(in_oklab,var(--color-warning)_15%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-wider text-[var(--color-warning)]">
            <WifiOff className="size-3" />
            <span className="hidden sm:inline">Sin conexión</span>
            <span className="sm:hidden">Off</span>
          </div>
        )}

        <div className="hidden items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] sm:flex">
          <CircleDot className={`size-3 ${supabaseEnabled ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`} />
          {supabaseEnabled ? 'Supabase' : 'Local'}
        </div>

        <Button variant="primary" size="sm" onClick={() => navigate('/ventas')}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nueva venta</span>
          <span className="ml-1 hidden font-mono text-[10px] opacity-70 sm:inline">N</span>
        </Button>
      </div>
    </header>
  )
}
