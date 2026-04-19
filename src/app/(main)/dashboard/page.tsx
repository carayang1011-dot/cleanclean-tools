import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Pencil, Calendar, ShoppingCart, DollarSign, Package,
  Star, Link2,
} from 'lucide-react'

const TOOLS = [
  { href: '/tools/design-requests', icon: Pencil,       label: '設計需求',    color: 'text-indigo-600 bg-indigo-50' },
  { href: '/tools/schedule',        icon: Calendar,     label: '合作排程',    color: 'text-blue-600 bg-blue-50' },
  { href: '/tools/team-buy',        icon: ShoppingCart, label: '團購紀錄',    color: 'text-violet-600 bg-violet-50' },
  { href: '/tools/payment',         icon: DollarSign,   label: '匯款管理',    color: 'text-emerald-600 bg-emerald-50' },
  { href: '/tools/shipping',        icon: Package,      label: '公關品寄件',  color: 'text-amber-600 bg-amber-50' },
  { href: '/tools/koc-wish',        icon: Star,         label: '合作許願清單', color: 'text-yellow-600 bg-yellow-50' },
  { href: '/tools/utm',             icon: Link2,        label: 'UTM 工具',   color: 'text-slate-600 bg-slate-100' },
]

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const profileId = cookieStore.get('profile_id')?.value
  if (!profileId) redirect('/setup')

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single()
  if (!profile) redirect('/setup')

  const roleMap: Record<string, string> = { requester: '需求方', designer: '設計師', admin: '管理員' }
  const roleLabel = roleMap[profile.role] ?? profile.role

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold">嗨，{profile.name} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{roleLabel}・行銷營運中心</p>
      </div>

      {/* 工具入口 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">快速入口</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {TOOLS.map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}>
              <Card className="shadow-none border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group h-full">
                <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
                  <div className={cn('rounded-xl p-3 group-hover:scale-110 transition-transform', color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium leading-tight">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 公告欄 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">公告欄</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground text-center py-4">目前沒有公告。</p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
