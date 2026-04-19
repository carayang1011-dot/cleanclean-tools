import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { RequestDetail } from '@/components/request-detail/request-detail'
import { HARDCODED_DESIGNERS } from '@/lib/constants'

interface Props { params: Promise<{ id: string }> }

export default async function RequestDetailPage({ params }: Props) {
  const { id } = await params
  const cookieStore = await cookies()
  const profileId = cookieStore.get('profile_id')?.value
  if (!profileId) redirect('/setup')

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single()
  if (!profile) redirect('/setup')

  const { data: request } = await supabase
    .from('design_requests')
    .select(`
      *,
      channel:channels(*),
      requester:profiles!design_requests_requester_id_fkey(*),
      designer:profiles!design_requests_designer_id_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (!request) notFound()

  const [{ data: comments }, { data: files }, { data: history }, { data: designers }] = await Promise.all([
    supabase.from('comments').select('*, author:profiles(*)').eq('request_id', id).order('created_at'),
    supabase.from('request_files').select('*, uploader:profiles(*)').eq('request_id', id).order('uploaded_at'),
    supabase.from('status_history').select('*, changer:profiles(*)').eq('request_id', id).order('created_at'),
    supabase.from('profiles').select('id, name').eq('role', 'designer'),
  ])

  const allDesigners = [
    ...(designers ?? []),
    ...HARDCODED_DESIGNERS.map(name => ({ id: `name:${name}`, name })),
  ]

  return (
    <RequestDetail
      request={request}
      comments={comments ?? []}
      files={files ?? []}
      history={history ?? []}
      designers={allDesigners}
      currentProfile={profile}
    />
  )
}
