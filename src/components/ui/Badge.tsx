import type { HTMLAttributes } from 'react'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  primary: 'bg-primary/10 text-primary',
}

export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold leading-none ${tones[tone]} ${className}`}
      {...props}
    />
  )
}
