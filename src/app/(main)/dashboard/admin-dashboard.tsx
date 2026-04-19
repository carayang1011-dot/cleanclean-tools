'use client'

import Link from 'next/link'
import { Users, FileText, CheckCircle2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MarketingShortcuts } from './marketing-shortcuts'
import { cn, formatDate, STATUS_LABEL, STATUS_COLOR } from '@/lib/utils'
import type { DesignRequest, Profile } from '@/lib/types'
import { differenceInDays } from 'date-fns'

interface Props { requests: DesignRequest[]; profiles: Profile[]; profile: Profile }

export function AdminDashboard({ requests, profiles }: Props) {
  const thisMonth = new Date().getMonth()
  const monthlyRequests = requests.filter(r => new Date(r.created_at).getMonth() === thisMonth)
  const completed = requests.filter(r => r.status === 'completed')
  const completionRate = requests.length > 0 ? Math.round((completed.length / requests.length) * 100) : 0
  const avgDays = completed.length > 0
    ? Math.round(completed.reduce((acc, r) => acc + differenceInDays(new Date(r.updated_at), new Date(r.created_at)), 0) / completed.length)
    : 0

  const channelStats: Record<string, number> = {}
  requests.forEach(r => {
    const name = r.channel?.name ?? '未分類'
    channelStats[name] = (channelStats[name] ?? 0) + 1
  })
  const topChannels = Object.entries(channelStats).sort((a,b) => b[1]-a[1]).slice(0,5)

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900">管理員總覽</h2>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '本月需求', value: monthlyRequests.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '完成率', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '平均交件天數', value: `${avgDays}天`, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: '使用者總數', value: profiles.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', bg)}>
                <Icon className={cn('h-5 w-5', color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 最新需求 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">最新需求（前10筆）</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requests.slice(0,10).map(req => (
                <Link key={req.id} href={`/requests/${req.id}`}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{req.activity_name}</p>
                    <p className="text-xs text-muted-foreground">{req.channel?.name} · {req.requester?.name}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', STATUS_COLOR[req.status])}>
                    {STATUS_LABEL[req.status]}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 渠道統計 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">各渠道需求量</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topChannels.map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm w-28 truncate">{name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-500 h-2 rounded-full"
                      style={{ width: `${Math.round((count / requests.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <MarketingShortcuts />
    </div>
  )
}
