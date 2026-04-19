'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncIndicatorProps {
  syncing?: boolean
  lastSynced?: string | null
  className?: string
}

export function SyncIndicator({ syncing = false, lastSynced, className }: SyncIndicatorProps) {
  if (syncing) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>同步中...</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-emerald-600', className)}>
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>
        已同步 Google Sheets
        {lastSynced && (
          <span className="text-muted-foreground ml-1">
            · {new Date(lastSynced).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </span>
    </div>
  )
}
