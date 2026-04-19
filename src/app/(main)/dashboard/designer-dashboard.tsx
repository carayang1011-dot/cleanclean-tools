'use client'

import Link from 'next/link'
import { cn, formatDate, STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MarketingShortcuts } from './marketing-shortcuts'
import { Badge } from '@/components/ui/badge'
import type { DesignRequest, Profile, Status } from '@/lib/types'

const COLUMNS: { status: Status; label: string; color: string }[] = [
  { status: 'pending',     label: '待處理',  color: 'border-t-slate-400' },
  { status: 'in_progress', label: '進行中',  color: 'border-t-blue-500' },
  { status: 'review',      label: '審核中',  color: 'border-t-yellow-500' },
  { status: 'completed',   label: '已完成',  color: 'border-t-green-500' },
]

interface Props { requests: DesignRequest[]; profile: Profile }

export function DesignerDashboard({ requests }: Props) {
  return (
    <div className="p-6 space-y-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">設計看板</h2>
        <p className="text-sm text-muted-foreground">共 {requests.length} 筆需求</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
        {COLUMNS.map(({ status, label, color }) => {
          const colRequests = requests.filter(r => r.status === status)
          return (
            <div key={status} className="flex flex-col gap-3 min-w-[240px]">
              <div className={cn('bg-white rounded-t-lg border border-b-0 px-4 py-3 flex items-center justify-between border-t-4', color)}>
                <span className="font-semibold text-sm">{label}</span>
                <Badge variant="secondary" className="text-xs">{colRequests.length}</Badge>
              </div>
              <div className="space-y-2 bg-gray-50 rounded-b-lg border border-t-0 p-2 min-h-[200px]">
                {colRequests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">無需求</div>
                ) : (
                  colRequests.map(req => (
                    <Link key={req.id} href={`/requests/${req.id}`}>
                      <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                        style={{ borderLeftColor: req.priority === 'urgent' ? '#ef4444' : req.priority === 'high' ? '#f97316' : '#e2e8f0' }}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-tight line-clamp-2">{req.activity_name}</span>
                            {req.priority !== 'normal' && (
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0', PRIORITY_COLOR[req.priority])}>
                                {req.priority === 'urgent' ? '緊急' : '高'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="truncate">{req.channel?.name}</span>
                              <span>·</span>
                              <span className="truncate">{req.purpose}</span>
                            </div>
                            {req.deadline && (
                              <div className="text-xs">📅 {formatDate(req.deadline)}</div>
                            )}
                            {req.requester && (
                              <div className="text-xs">👤 {req.requester.name}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <MarketingShortcuts />
    </div>
  )
}
