'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'
import { STATUS_LABEL } from '@/lib/utils'

interface Notification {
  id: string
  message: string
  request_id: number
  created_at: string
  read: boolean
}

export function useNotifications(profile: Profile | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return

    // 監聽 design_requests 狀態變更
    const channel = supabase
      .channel('design-requests-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'design_requests' },
        (payload) => {
          const { new: newRow, old: oldRow } = payload
          if (newRow.status === oldRow.status) return

          // 需求方：自己的需求被更新
          if (profile.role === 'requester' && newRow.requester_id === profile.id) {
            const msg = `需求「${newRow.activity_name}」狀態更新為「${STATUS_LABEL[newRow.status as keyof typeof STATUS_LABEL]}」`
            toast.info(msg, { duration: 5000 })
            setNotifications(prev => [{
              id: `${Date.now()}`,
              message: msg,
              request_id: newRow.id,
              created_at: new Date().toISOString(),
              read: false,
            }, ...prev.slice(0, 19)])
          }

          // 設計師：有新需求進來
          if (profile.role === 'designer' && newRow.status === 'pending' && !oldRow.status) {
            const msg = `收到新需求「${newRow.activity_name}」`
            toast.success(msg, { duration: 5000 })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'design_requests' },
        (payload) => {
          if (profile.role === 'designer' || profile.role === 'admin') {
            toast.success(`新需求：${payload.new.activity_name}`, { duration: 5000 })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, supabase])

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, markAllRead }
}
