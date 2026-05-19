import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { Button } from './Button.jsx'

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 anim-fade-in">
      <div
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink-950)_70%,transparent)] backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elev)] shadow-2xl',
          'anim-fade-up',
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-6 border-b border-[var(--border)] px-6 py-4">
          <div className="min-w-0">
            <h2 className="display text-2xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-[var(--text-subtle)]">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cerrar">
            <X className="size-4" />
          </Button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
