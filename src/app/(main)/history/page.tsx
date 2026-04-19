import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { HistoryTable } from '@/components/history-table/data-table'

export default async function HistoryPage() {
  const cookieStore = await cookies()
  const profileId = cookieStore.get('profile_id')?.value
  if (!profileId) redirect('/setup')

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single()
  if (!profile) redirect('/setup')

  const { data: requests } = await supabase
    .from('design_requests')
    .select(`*, channel:channels(id,name), requester:profiles!design_requests_requester_id_fkey(id,name), designer:profiles!design_requests_designer_id_fkey(id,name)`)
    .order('created_at', { ascending: false })

  const { data: channels } = await supabase.from('channels').select('id, name').order('sort_order')
  const { data: designers } = await supabase.from('profiles').select('id, name').eq('role', 'designer')

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">歷史資料總覽</h2>
        <p className="text-sm text-muted-foreground mt-1">所有設計需求紀錄</p>
      </div>
      <HistoryTable
        requests={requests ?? []}
        channels={channels ?? []}
        designers={designers ?? []}
        currentProfile={profile}
      />
    </div>
  )
}
