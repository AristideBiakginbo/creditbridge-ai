import type { LucideIcon } from 'lucide-react'

export type StatusTone = 'success' | 'warning' | 'error' | 'neutral'

interface StatusCardProps {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone?: StatusTone
}

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  error: 'bg-rose-50 text-rose-800 ring-rose-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export function StatusCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: StatusCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-1 font-semibold text-slate-950">{value}</p>
        </div>
        <span className={`rounded-lg p-2 ring-1 ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" size={18} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  )
}
