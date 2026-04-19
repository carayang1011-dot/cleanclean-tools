import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HistoryTable } from '@/components/history-table/data-table'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

export default async function DesignRequestsPage() {
  const cookieStore = await cookies()
  const profileIdRaw = cookieStore.get('profile_id')?.value
  if (!profileIdRaw) redirect('/setup')
  const profileId = profileIdRaw as string

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single()
  if (!profile) redirect('/setup')

  const query = supabase
    .from('design_requests')
    .select(`*, channel:channels(id,name,slug), requester:profiles!design_requests_requester_id_fkey(id,name), designer:profiles!design_requests_designer_id_fkey(id,name)`)
    .order('created_at', { ascending: false })

  const finalQuery = profile.role === 'requester'
    ? query.eq('requester_id', profileId)
    : query

  const [{ data: requests }, { data: channels }, { data: designers }] = await Promise.all([
    finalQuery,
    supabase.from('channels').select('*').order('sort_order'),
    supabase.from('profiles').select('id, name').eq('role', 'designer'),
  ])

  const all = requests ?? []

  type PendingGroup = { channel: { id: number; name: string }; requests: typeof all }
  const pendingByChannel: PendingGroup[] = profile.role !== 'requester'
    ? (channels ?? []).reduce((acc: PendingGroup[], ch) => {
        const reqs = all.filter(r => r.channel_id === ch.id && r.status === 'pending')
        if (reqs.length > 0) acc.push({ channel: ch, requests: reqs })
        return acc
      }, [])
    : []

  const pending    = all.filter(r => r.status === 'pending').length
  const inProgress = all.filter(r => ['in_progress', 'review', 'revision'].includes(r.status)).length
  const completed  = all.filter(r => r.status === 'completed').length
  const urgent     = all.filter(r => r.priority === 'urgent' && r.status !== 'completed').length

  const stats = [
    { label: '待處理', value: pending,    color: 'text-slate-700' },
    { label: '進行中', value: inProgress, color: 'text-blue-700' },
    { label: '已完成', value: completed,  color: 'text-emerald-700' },
    { label: '緊急',   value: urgent,     color: 'text-red-700' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* 標題 + 發新需求按鈕 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">設計需求</h1>
          <p className="text-sm text-muted-foreground mt-0.5">所有設計稿件需求與進度追蹤</p>
        </div>
        <Button asChild size="lg" className="gap-2 bg-brand-800 hover:bg-brand-900 text-white shrink-0">
          <Link href="/requests/new">
            <Plus className="h-5 w-5" />發新需求
          </Link>
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 設計師：新進需求依渠道分組 */}
      {profile.role !== 'requester' && pendingByChannel.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">新進需求</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
              共 {pendingByChannel.reduce((n: number, g: PendingGroup) => n + g.requests.length, 0)} 筆待處理
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingByChannel.map(({ channel, requests: reqs }) => (
              <Card key={channel.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm">{channel.name}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{reqs.length} 筆</span>
                  </div>
                  <div className="space-y-2">
                    {reqs.map(req => (
                      <Link key={req.id} href={`/requests/${req.id}`}
                        className="flex items-center justify-between gap-2 text-sm hover:text-brand-700 group">
                        <span className="truncate group-hover:underline">
                          {req.activity_name}
                          {req.priority === 'urgent' && <span className="ml-1 text-xs text-red-600">緊急</span>}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {(req.requester as { name?: string } | null | undefined)?.name ?? '—'}
                        </span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 需求列表 */}
      <HistoryTable
        requests={all}
        channels={channels ?? []}
        designers={designers ?? []}
        currentProfile={profile}
      />
    </div>
  )
}
