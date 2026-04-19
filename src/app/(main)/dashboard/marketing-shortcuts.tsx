import Link from 'next/link'
import {
  Calendar, ShoppingCart, DollarSign, Package,
  Star, Link2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const TOOLS = [
  { href: '/tools/schedule', icon: Calendar,     label: '合作排程',    color: 'text-blue-600 bg-blue-50' },
  { href: '/tools/team-buy', icon: ShoppingCart, label: '團購紀錄',    color: 'text-violet-600 bg-violet-50' },
  { href: '/tools/payment',  icon: DollarSign,   label: '匯款管理',    color: 'text-emerald-600 bg-emerald-50' },
  { href: '/tools/shipping', icon: Package,      label: '公關品寄件',  color: 'text-amber-600 bg-amber-50' },
  { href: '/tools/koc-wish', icon: Star,         label: '合作許願清單', color: 'text-yellow-600 bg-yellow-50' },
  { href: '/tools/utm',      icon: Link2,        label: 'UTM 工具',   color: 'text-slate-600 bg-slate-100' },
]

export function MarketingShortcuts() {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">行銷工具</h3>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {TOOLS.map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <Card className="shadow-none border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group h-full">
              <CardContent className="p-3 flex flex-col items-center gap-2 text-center">
                <div className={`rounded-lg p-2 ${color} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium leading-tight">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
