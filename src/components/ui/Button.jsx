import { cn } from '@/lib/utils.js'

const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-[transform,background,color,border,box-shadow] duration-150 active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none'

const variants = {
  // Acento de marca — texto siempre negro absoluto (alto contraste sobre chartreuse)
  primary:
    'bg-[var(--accent)] text-[var(--accent-fg)] font-bold tracking-tight shadow-[0_1px_0_color-mix(in_oklab,var(--accent)_50%,white)_inset,0_8px_24px_-12px_color-mix(in_oklab,var(--accent)_60%,transparent)] hover:brightness-[1.04] active:brightness-95',

  // Botón secundario sólido y legible en ambos temas
  secondary:
    'bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border-strong)] hover:bg-[color-mix(in_oklab,var(--bg-card)_70%,var(--text)_8%)]',

  // Ghost — texto principal con opacidad alta (legible)
  ghost:
    'text-[var(--text)] opacity-80 hover:opacity-100 hover:bg-[color-mix(in_oklab,var(--text)_8%,transparent)]',

  // Outline más definido — texto fuerte y border claro
  outline:
    'border border-[var(--border-strong)] text-[var(--text)] hover:border-[var(--accent)] hover:bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]',

  // Danger — rojo sólido con texto blanco SIEMPRE para contraste
  danger:
    'bg-[var(--color-danger)] text-white font-semibold hover:brightness-110 active:brightness-95',

  // Link — usa accent-text adaptado al tema (no el chartreuse claro en light)
  link:
    'text-[var(--accent-text)] hover:underline underline-offset-4 px-0 py-0 font-medium',
}

const sizes = {
  xs: 'h-7 px-2.5 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-base',
  icon: 'h-9 w-9 p-0',
  'icon-sm': 'h-8 w-8 p-0',
}

export function Button({ variant = 'secondary', size = 'md', className, as: Comp = 'button', ...props }) {
  return <Comp className={cn(base, variants[variant], sizes[size], className)} {...props} />
}
