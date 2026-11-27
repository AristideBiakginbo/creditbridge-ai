import type { LucideIcon } from 'lucide-react'
import { Card } from '../ui/Card'

interface StatCardProps {
  label: string
  value: string
  note: string
  icon: LucideIcon
  tone?: 'primary' | 'teal' | 'amber' | 'violet'
}

const iconColors = {
  primary: 'bg-primary/10 text-primary',
  teal: 'bg-secondary/10 text-secondary',
  amber: 'bg-warning/10 text-warning',
  violet: 'bg-chart-3/10 text-chart-3',
}

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone = 'primary',
}: StatCardProps) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="financial-value mt-2 truncate font-display text-2xl font-extrabold text-foreground sm:text-[1.7rem]">
            {value}
          </p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${iconColors[tone]}`}>
          <Icon aria-hidden="true" size={19} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{note}</p>
    </Card>
  )
}
