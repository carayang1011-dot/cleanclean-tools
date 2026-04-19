export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { MainClientLayout } from './main-client-layout'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const profileId = cookieStore.get('profile_id')?.value

  if (!profileId) redirect('/setup')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (!profile) redirect('/setup')

  return <MainClientLayout profile={profile}>{children}</MainClientLayout>
}
