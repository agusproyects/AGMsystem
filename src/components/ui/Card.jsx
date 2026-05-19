import { cn } from '@/lib/utils.js'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'relative rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/85 backdrop-blur-sm',
        'shadow-[0_1px_0_color-mix(in_oklab,var(--text)_5%,transparent)_inset]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-4 pb-3', className)}>
      <div className="min-w-0">
        {title && <h3 className="text-sm font-medium tracking-tight text-[var(--text)]">{title}</h3>}
        {subtitle && <p className="mt-0.5 text-xs text-[var(--text-subtle)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, children, ...props }) {
  return <div className={cn('px-5 pb-5', className)} {...props}>{children}</div>
}

export function StatCard({ label, value, hint, accent, trend }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-subtle)]">{label}</span>
          {trend && (
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-mono',
              trend.startsWith('-')
                ? 'bg-[color-mix(in_oklab,var(--color-danger)_18%,transparent)] text-[var(--color-danger)]'
                : 'bg-[color-mix(in_oklab,var(--color-success)_18%,transparent)] text-[var(--color-success)]'
            )}>
              {trend}
            </span>
          )}
        </div>
        <div className={cn('mt-2 display text-4xl', accent && 'text-[var(--accent-text)]')}>{value}</div>
        {hint && <p className="mt-1 text-xs text-[var(--text-subtle)]">{hint}</p>}
      </div>
    </Card>
  )
}
