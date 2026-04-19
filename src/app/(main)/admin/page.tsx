import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AdminPanel } from './admin-panel'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const profileId = cookieStore.get('profile_id')?.value
  if (!profileId) redirect('/setup')

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const [{ data: profiles }, { data: channels }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('channels').select('*').order('sort_order'),
  ])

  return <AdminPanel profiles={profiles ?? []} channels={channels ?? []} currentUserId={profileId} />
}
