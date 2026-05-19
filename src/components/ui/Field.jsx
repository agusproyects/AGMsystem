import { cn } from '@/lib/utils.js'

const ctrl = 'h-9 w-full rounded-md bg-[var(--bg-elev)] border border-[var(--border-strong)] px-3 text-sm placeholder:text-[var(--text-subtle)] transition-colors hover:border-[color-mix(in_oklab,var(--text)_18%,var(--border-strong))] focus:border-[var(--accent)]'

export function Label({ children, htmlFor, hint, className }) {
  return (
    <label htmlFor={htmlFor} className={cn('flex items-baseline justify-between text-xs uppercase tracking-wider text-[var(--text-subtle)]', className)}>
      <span>{children}</span>
      {hint && <span className="font-mono text-[10px] text-[var(--text-subtle)]">{hint}</span>}
    </label>
  )
}

export function Input({ className, ...props }) {
  return <input className={cn(ctrl, className)} {...props} />
}

export function Textarea({ className, rows = 3, ...props }) {
  return <textarea rows={rows} className={cn(ctrl, 'h-auto py-2 resize-y leading-relaxed', className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(ctrl, 'appearance-none pr-8 bg-no-repeat',
        '[background-image:url("data:image/svg+xml;utf8,<svg%20xmlns=\'http://www.w3.org/2000/svg\'%20width=\'10\'%20height=\'6\'%20viewBox=\'0%200%2010%206\'><path%20d=\'M1%201l4%204%204-4\'%20stroke=\'%239b988a\'%20stroke-width=\'1.4\'%20fill=\'none\'%20stroke-linecap=\'round\'/></svg>")] bg-[position:right_10px_center]',
        className)}
      {...props}
    >
      {children}
    </select>
  )
}

export function Field({ label, hint, error, children, className, id }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <Label htmlFor={id} hint={hint}>{label}</Label>}
      {children}
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  )
}
