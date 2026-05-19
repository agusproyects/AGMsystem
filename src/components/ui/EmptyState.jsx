import { cn } from '@/lib/utils.js'

export function EmptyState({ icon: Icon, title, hint, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}>
      {Icon && (
        <div className="grid size-12 place-items-center rounded-full border border-[var(--border-strong)] text-[var(--text-subtle)]">
          <Icon className="size-5" />
        </div>
      )}
      <h3 className="display text-2xl">{title}</h3>
      {hint && <p className="max-w-sm text-sm text-[var(--text-subtle)]">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
