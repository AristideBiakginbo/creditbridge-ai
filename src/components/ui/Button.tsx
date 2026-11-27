import type { ButtonHTMLAttributes } from 'react'
import { buttonClasses } from './buttonStyles'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const sizeClass =
    size === 'sm' ? 'min-h-9 rounded-lg px-3 py-2 text-xs' :
      size === 'lg' ? 'min-h-12 rounded-xl px-5 py-3 text-base' : ''

  return (
    <button
      className={buttonClasses(variant, `${sizeClass} ${className}`)}
      {...props}
    />
  )
}
