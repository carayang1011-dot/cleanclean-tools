'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Settings, Leaf,
  ChevronLeft, ChevronRight, ChevronDown,
  DollarSign, Package,
  Star, Link2,
  Pencil, Wrench, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import { useState, useEffect } from 'react'

const allTools = [
  { href: '/tools/design-requests', icon: Pencil,        label: '設計需求' },
  { href: '/tools/cooperations',    icon: Users,         label: '合作紀錄' },
  { href: '/tools/payment',         icon: DollarSign,    label: '匯款管理' },
  { href: '/tools/shipping',        icon: Package,       label: '公關品寄件' },
  { href: '/tools/koc-wish',        icon: Star,          label: '合作許願清單' },
  { href: '/tools/utm',             icon: Link2,         label: 'UTM 工具' },
]

interface SidebarProps { profile: Profile }

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-tools-open')
    if (stored !== null) setToolsOpen(stored === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-tools-open', String(toolsOpen))
  }, [toolsOpen])

  useEffect(() => {
    if (pathname.startsWith('/tools')) setToolsOpen(true)
  }, [pathname])

  const isToolsActive = pathname.startsWith('/tools')
  const showAdmin = profile.role === 'admin'

  return (
    <aside className={cn(
      'relative flex flex-col text-white transition-all duration-300 shrink-0',
      collapsed ? 'w-16' : 'w-56'
    )} style={{ backgroundColor: 'oklch(30% .06 210)' }}>

      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/10',
        collapsed && 'justify-center px-0'
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 shrink-0">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight truncate">淨淨 CleanClean</p>
            <p className="text-xs text-white/50 truncate">行銷營運中心</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">

        {/* 儀表板 */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === '/dashboard'
              ? 'bg-white/20 text-white'
              : 'text-white/70 hover:bg-white/10 hover:text-white',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? '儀表板' : undefined}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          {!collapsed && <span>儀表板</span>}
        </Link>

        <div className="my-2 border-t border-white/10" />

        {/* 工具 expandable */}
        {!collapsed ? (
          <>
            <button
              onClick={() => setToolsOpen(v => !v)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isToolsActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Wrench className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">工具</span>
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform duration-200',
                toolsOpen && 'rotate-180'
              )} />
            </button>

            {toolsOpen && (
              <div className="ml-3 pl-3 border-l border-white/20 space-y-0.5">
                {allTools.map(({ href, icon: Icon, label }) => {
                  const active = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        active
                          ? 'bg-white/20 text-white'
                          : 'text-white/60 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <Link
            href="/tools/design-requests"
            className={cn(
              'flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isToolsActive
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            )}
            title="工具"
          >
            <Wrench className="h-5 w-5 shrink-0" />
          </Link>
        )}

        {/* Admin */}
        {showAdmin && (
          <>
            <div className="my-2 border-t border-white/10" />
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? '系統管理' : undefined}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!collapsed && <span>系統管理</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="absolute -right-3 top-20 flex items-center justify-center w-6 h-6 rounded-full bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors z-10"
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-white/70 font-medium truncate">{profile.name}</p>
          <p className="text-xs text-white/40">
            {{ requester: '需求方', designer: '設計師', admin: '管理員' }[profile.role]}
          </p>
        </div>
      )}
    </aside>
  )
}
