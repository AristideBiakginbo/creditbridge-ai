import type { ButtonVariant } from './Button'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm hover:brightness-110 active:translate-y-px',
  secondary:
    'bg-secondary text-white shadow-sm hover:brightness-110 active:translate-y-px',
  outline:
    'border border-border bg-surface text-foreground hover:bg-muted active:translate-y-px',
  ghost: 'text-foreground hover:bg-muted',
  danger:
    'bg-destructive text-white shadow-sm hover:brightness-110 active:translate-y-px',
}

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  className = '',
): string {
  return [
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
