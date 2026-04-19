import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCard {
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: LucideIcon
  iconClassName?: string
}

interface StatCardsProps {
  cards: StatCard[]
}

export function StatCards({ cards }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <Card key={i} className="border-border shadow-none">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">{card.label}</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums">{card.value}</p>
                  {card.subtext && (
                    <p className={cn(
                      'text-xs mt-1',
                      card.trend === 'up' && 'text-emerald-600',
                      card.trend === 'down' && 'text-destructive',
                      (!card.trend || card.trend === 'neutral') && 'text-muted-foreground'
                    )}>
                      {card.subtext}
                    </p>
                  )}
                </div>
                {Icon && (
                  <div className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-lg shrink-0',
                    card.iconClassName ?? 'bg-primary/10 text-primary'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
