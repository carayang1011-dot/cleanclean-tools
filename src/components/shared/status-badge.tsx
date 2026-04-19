import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: string
  colorMap?: Record<string, string>
  labelMap?: Record<string, string>
}

const DEFAULT_COLOR_MAP: Record<string, string> = {
  pending:    'bg-slate-100 text-slate-700 border-slate-200',
  active:     'bg-blue-50 text-blue-700 border-blue-200',
  completed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
  processing: 'bg-amber-50 text-amber-700 border-amber-200',
  paid:       'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  unpaid:     'bg-red-50 text-red-700 border-red-200',
  sent:       'bg-blue-50 text-blue-700 border-blue-200',
  tms_sent:   'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export function StatusBadge({ status, colorMap, labelMap }: StatusBadgeProps) {
  const merged = { ...DEFAULT_COLOR_MAP, ...(colorMap ?? {}) }
  const className = merged[status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
  const label = labelMap?.[status] ?? status

  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`}>
      {label}
    </Badge>
  )
}
