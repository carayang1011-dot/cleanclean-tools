'use client'

import { Bell, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import { useNotifications } from '@/hooks/use-notifications'

interface HeaderProps {
  profile: Profile
  onSignOut: () => void
  title?: string
}

export function Header({ profile, onSignOut, title }: HeaderProps) {
  const { unreadCount, notifications, markAllRead } = useNotifications(profile)
  const roleLabel = { requester: '需求方', designer: '設計師', admin: '管理員' }[profile.role]

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <div>
        {title && <h1 className="text-base font-semibold text-gray-900">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {/* 通知鈴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" onClick={markAllRead}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>通知</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">暫無通知</div>
            ) : (
              notifications.slice(0, 8).map(n => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-2">
                  <span className="text-sm leading-tight">{n.message}</span>
                  <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleTimeString('zh-TW')}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 使用者選單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="bg-brand-100 text-brand-800 text-xs font-bold">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-tight">{profile.name}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile.name}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
