'use client'

import Link from 'next/link'
import { PlusCircle, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate, STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL } from '@/lib/utils'
import type { DesignRequest, Profile } from '@/lib/types'
import { MarketingShortcuts } from './marketing-shortcuts'

interface Props { requests: DesignRequest[]; profile: Profile }

export function RequesterDashboard({ requests, profile }: Props) {
  const myRequests = requests.filter(r => r.requester_id === profile.id)
  const pending = myRequests.filter(r => r.status === 'pending').length
  const inProgress = myRequests.filter(r => ['in_progress','review','revision'].includes(r.status)).length
  const completed = myRequests.filter(r => r.status === 'completed').length
  const urgent = myRequests.filter(r => r.priority === 'urgent' && r.status !== 'completed').length

  const recent = myRequests.slice(0, 8)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* 歡迎列 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">嗨，{profile.name} 👋</h2>
          <p className="text-sm text-muted-foreground mt-1">以下是你的設計需求總覽</p>
        </div>
        <Button asChild className="bg-brand-800 hover:bg-brand-900 text-white">
          <Link href="/requests/new"><PlusCircle className="h-4 w-4" />新增設計需求</Link>
        </Button>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '待處理', value: pending, icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: '進行中', value: inProgress, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '已完成', value: completed, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '緊急需求', value: urgent, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
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

      {/* 最近需求 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">最近的需求</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">還沒有任何需求</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/requests/new">提交第一個需求</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(req => (
                <Link
                  key={req.id}
                  href={`/requests/${req.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate group-hover:text-brand-800">{req.activity_name}</span>
                      {req.priority === 'urgent' && <span className="text-xs text-red-600 font-medium">🔴 緊急</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{req.channel?.name}</span>
                      <span>·</span>
                      <span>{req.purpose}</span>
                      {req.deadline && <><span>·</span><span>截止 {formatDate(req.deadline)}</span></>}
                    </div>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', STATUS_COLOR[req.status])}>
                    {STATUS_LABEL[req.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MarketingShortcuts />
    </div>
  )
}
