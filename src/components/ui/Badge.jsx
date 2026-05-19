import { cn } from '@/lib/utils.js'

const tones = {
  neutral: 'border-[var(--border-strong)] text-[var(--text-muted)] bg-transparent',
  brand:   'border-transparent !text-black font-semibold bg-[var(--accent)]',
  success: 'border-transparent text-[var(--color-success)] bg-[color-mix(in_oklab,var(--color-success)_18%,transparent)]',
  warning: 'border-transparent text-[var(--color-warning)] bg-[color-mix(in_oklab,var(--color-warning)_18%,transparent)]',
  danger:  'border-transparent text-[var(--color-danger)]  bg-[color-mix(in_oklab,var(--color-danger)_18%,transparent)]',
  info:    'border-transparent text-[var(--color-info)]    bg-[color-mix(in_oklab,var(--color-info)_18%,transparent)]',
}

export function Badge({ tone = 'neutral', children, className, dot = false }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
      tones[tone],
      className,
    )}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
