import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'
import { useStore } from '@/store/useStore.js'
import { cn } from '@/lib/utils.js'

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  danger: XCircle,
}

const tones = {
  success: 'border-[color-mix(in_oklab,var(--color-success)_60%,var(--border-strong))]',
  warning: 'border-[color-mix(in_oklab,var(--color-warning)_60%,var(--border-strong))]',
  info:    'border-[var(--border-strong)]',
  danger:  'border-[color-mix(in_oklab,var(--color-danger)_60%,var(--border-strong))]',
}

const accents = {
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  info:    'text-[var(--accent-text)]',
  danger:  'text-[var(--color-danger)]',
}

export function Toaster() {
  const toasts = useStore(s => s.toasts)
  const dismiss = useStore(s => s.dismissToast)
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-[min(90vw,360px)] flex-col gap-2">
      {toasts.map(t => {
        const Icon = icons[t.kind] || Info
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto anim-slide-r flex items-start gap-3 rounded-xl border bg-[var(--bg-elev)]/95 backdrop-blur px-4 py-3 shadow-lg',
              tones[t.kind] || tones.info,
            )}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', accents[t.kind] || accents.info)} />
            <div className="min-w-0 flex-1">
              {t.title && <p className="text-sm font-medium leading-tight">{t.title}</p>}
              {t.message && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{t.message}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-[var(--text-subtle)] hover:text-[var(--text)]"
              aria-label="Cerrar"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
