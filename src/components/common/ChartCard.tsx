import type { PropsWithChildren, ReactNode } from 'react'
import { Card } from '../ui/Card'

interface ChartCardProps extends PropsWithChildren {
  title: string
  description?: string
  className?: string
  action?: ReactNode
}

export function ChartCard({
  title,
  description,
  className = '',
  action,
  children,
}: ChartCardProps) {
  return (
    <Card as="section" className={`min-w-0 p-4 sm:p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </Card>
  )
}
