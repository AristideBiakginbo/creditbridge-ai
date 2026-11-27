import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'div' | 'section'
}

export function Card({
  as: Component = 'div',
  className = '',
  ...props
}: CardProps) {
  return (
    <Component
      className={`rounded-2xl border border-border bg-surface shadow-sm ${className}`}
      {...props}
    />
  )
}

export function CardHeader({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-5 pt-5 sm:px-6 sm:pt-6 ${className}`} {...props} />
}

export function CardContent({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-5 pb-5 sm:px-6 sm:pb-6 ${className}`} {...props} />
}
