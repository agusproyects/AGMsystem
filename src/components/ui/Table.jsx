import { cn } from '@/lib/utils.js'

export function Table({ className, children }) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/60', className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  )
}

export function THead({ children }) {
  return (
    <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-[var(--text-subtle)]">
      {children}
    </thead>
  )
}

export function TR({ className, ...props }) {
  return <tr className={cn('border-b border-[var(--border)] last:border-0 hover:bg-[color-mix(in_oklab,var(--text)_4%,transparent)] transition-colors', className)} {...props} />
}

export function TH({ className, children, align = 'left' }) {
  return <th className={cn('px-4 py-3 font-medium', align === 'right' && 'text-right', align === 'center' && 'text-center', className)}>{children}</th>
}

export function TD({ className, children, align = 'left', mono = false }) {
  return (
    <td className={cn('px-4 py-3 text-[var(--text)]', mono && 'font-mono tabular-nums', align === 'right' && 'text-right', align === 'center' && 'text-center', className)}>
      {children}
    </td>
  )
}
