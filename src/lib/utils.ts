import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { Status, Priority } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'yyyy/MM/dd', { locale: zhTW })
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'yyyy/MM/dd HH:mm', { locale: zhTW })
}

export function formatRelativeTime(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhTW })
}

export const STATUS_LABEL: Record<Status, string> = {
  pending:     '待處理',
  in_progress: '進行中',
  review:      '審核中',
  revision:    '修改中',
  completed:   '已完成',
}

export const STATUS_COLOR: Record<Status, string> = {
  pending:     'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review:      'bg-yellow-100 text-yellow-700',
  revision:    'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: '🔴 緊急',
  high:   '🟠 高',
  normal: '🟡 一般',
  low:    '⚪ 低',
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high:   'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-slate-100 text-slate-600 border-slate-200',
  low:    'bg-gray-50 text-gray-500 border-gray-200',
}

export function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}
