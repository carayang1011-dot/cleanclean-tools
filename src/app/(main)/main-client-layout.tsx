'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import type { Profile } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface Props {
  profile: Profile
  children: React.ReactNode
}

export function MainClientLayout({ profile, children }: Props) {
  const router = useRouter()

  const handleSignOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.push('/setup')
    router.refresh()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar profile={profile} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header profile={profile} onSignOut={handleSignOut} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
