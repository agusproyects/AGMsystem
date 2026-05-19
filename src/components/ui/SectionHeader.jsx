import { cn } from '@/lib/utils.js'

export function SectionHeader({ eyebrow, title, description, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-text)]">
            {eyebrow}
          </p>
        )}
        <h1 className="display mt-1 text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  )
}
