import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { NewRequestForm } from '@/components/request-form/step-form'

export default async function NewRequestPage() {
  const cookieStore = await cookies()
  const profileId = cookieStore.get('profile_id')?.value
  if (!profileId) redirect('/setup')

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single()
  if (!profile || profile.role === 'designer') redirect('/dashboard')

  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .order('sort_order')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">新增設計需求</h2>
        <p className="text-sm text-muted-foreground mt-1">填寫完整資訊有助設計師快速理解需求</p>
      </div>
      <NewRequestForm channels={channels ?? []} requesterId={profileId} />
    </div>
  )
}
