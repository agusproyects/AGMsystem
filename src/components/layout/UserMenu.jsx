import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, User as UserIcon, ChevronUp } from 'lucide-react'
import { useStore } from '@/store/useStore.js'
import { signOut } from '@/lib/auth.js'
import { cn } from '@/lib/utils.js'

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '·'
}

export function UserMenu({ collapsed }) {
  const session = useStore(s => s.session)
  const clearSession = useStore(s => s.clearSession)
  const toast = useStore(s => s.pushToast)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!session) return null

  const cerrar = async () => {
    await signOut()
    clearSession()
    toast({ kind: 'info', title: 'Sesión cerrada' })
    navigate('/auth', { replace: true })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 transition-colors',
          'hover:border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--text)_5%,transparent)]',
          open && 'border-[var(--border)] bg-[color-mix(in_oklab,var(--text)_5%,transparent)]',
          collapsed && 'justify-center px-1',
        )}
        title={collapsed ? session.email : undefined}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] font-mono text-xs font-semibold text-[var(--accent-fg)]">
          {initials(session.name || session.email)}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium">{session.name || session.email.split('@')[0]}</span>
              <span className="block truncate text-[11px] text-[var(--text-subtle)]">{session.email}</span>
            </span>
            <ChevronUp className={cn('size-3.5 text-[var(--text-subtle)] transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      {open && (
        <div className={cn(
          'absolute bottom-full mb-2 w-56 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elev)] p-1 shadow-2xl anim-fade-up',
          collapsed ? 'left-full ml-2' : 'left-0 right-0',
        )}>
          <div className="border-b border-[var(--border)] px-3 py-2">
            <p className="truncate text-sm font-medium">{session.name || 'Usuario'}</p>
            <p className="truncate text-[11px] text-[var(--text-subtle)]">{session.email}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
              {session.mode === 'supabase' ? 'Cuenta Supabase' : 'Cuenta local (demo)'}
            </p>
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/ajustes') }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)] hover:text-[var(--text)]"
          >
            <Settings className="size-4" /> Ajustes
          </button>
          <button
            onClick={cerrar}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[color-mix(in_oklab,var(--color-danger)_12%,transparent)]"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
