import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { CooperationsTable } from '@/components/cooperations/cooperations-table'

export default async function CooperationsPage() {
  const cookieStore = await cookies()
  const profileId = cookieStore.get('profile_id')?.value
  if (!profileId) redirect('/setup')

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single()
  if (!profile) redirect('/setup')

  const { data: cooperations } = await supabase
    .from('cooperations')
    .select('*')
    .order('start_date', { ascending: false })
    .order('id', { ascending: false })

  const all = cooperations ?? []

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">合作紀錄</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          共 {all.length} 筆 KOC/KOL 合作紀錄 · 2023–2026
        </p>
      </div>

      <CooperationsTable initialData={all} />
    </div>
  )
}
