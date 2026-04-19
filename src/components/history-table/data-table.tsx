'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  getSortedRowModel, getPaginationRowModel, flexRender,
  type ColumnDef, type SortingState, type ColumnFiltersState,
} from '@tanstack/react-table'
import { cn, formatDate, STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ChevronUp, ChevronDown, Download, LayoutList, LayoutGrid, Pencil, Loader2, Layers, Columns } from 'lucide-react'
import { bulkUpdateStatus, updateRequest } from '@/lib/actions'
import type { DesignRequest, Profile, Channel } from '@/lib/types'

function parseHistoricalNotes(notes: string | null): { requesterName: string | null; designerName: string | null } {
  if (!notes?.startsWith('歷史匯入')) return { requesterName: null, designerName: null }
  const parts = notes.split(' | ')
  let requesterName: string | null = null
  let designerName: string | null = null
  for (const p of parts) {
    if (p.startsWith('設計師:')) designerName = p.slice(4)
    if (p.startsWith('發案:')) requesterName = p.slice(3)
  }
  return { requesterName, designerName }
}

const KANBAN_COLS = [
  { key: 'pending',     label: '待處理', headerBg: 'bg-slate-100 border-slate-200',  dot: 'bg-slate-500'  },
  { key: 'in_progress', label: '製作中', headerBg: 'bg-blue-100 border-blue-200',    dot: 'bg-blue-500'   },
  { key: 'review',      label: '待審核', headerBg: 'bg-violet-100 border-violet-200', dot: 'bg-violet-500' },
  { key: 'revision',    label: '需修改', headerBg: 'bg-orange-100 border-orange-200', dot: 'bg-orange-500' },
] as const

interface Props {
  requests: DesignRequest[]
  channels: Pick<Channel, 'id' | 'name'>[]
  designers: Pick<Profile, 'id' | 'name'>[]
  currentProfile: Profile
}

export function HistoryTable({ requests, channels, designers, currentProfile }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [designerFilter, setDesignerFilter] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'card' | 'group' | 'kanban'>('kanban')
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [editTarget, setEditTarget] = useState<DesignRequest | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  const isAdmin = currentProfile.role === 'admin'

  const ACTIVE_STATUSES = ['pending', 'in_progress', 'review', 'revision']
  const activeCount = requests.filter(r => ACTIVE_STATUSES.includes(r.status)).length
  const historyCount = requests.filter(r => r.status === 'completed').length

  const filtered = useMemo(() => {
    let data = activeTab === 'active'
      ? requests.filter(r => ACTIVE_STATUSES.includes(r.status))
      : requests.filter(r => r.status === 'completed')
    if (statusFilter) data = data.filter(r => r.status === statusFilter)
    if (channelFilter) data = data.filter(r => r.channel_id === Number(channelFilter))
    if (designerFilter) data = data.filter(r => r.designer_id === designerFilter)
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      data = data.filter(r => {
        const { requesterName, designerName } = parseHistoricalNotes(r.notes)
        return (
          r.activity_name.toLowerCase().includes(q) ||
          r.purpose.toLowerCase().includes(q) ||
          r.requester?.name?.toLowerCase().includes(q) ||
          (r.requester_name?.toLowerCase() ?? requesterName?.toLowerCase() ?? '').includes(q) ||
          (r.designer_name?.toLowerCase() ?? designerName?.toLowerCase() ?? '').includes(q) ||
          r.channel?.name?.toLowerCase().includes(q)
        )
      })
    }
    return data
  }, [requests, statusFilter, channelFilter, designerFilter, globalFilter])

  const groupedByChannel = useMemo(() => {
    const map = new Map<number | null, { name: string; requests: DesignRequest[] }>()
    filtered.forEach(r => {
      const key = r.channel_id ?? null
      if (!map.has(key)) map.set(key, { name: r.channel?.name ?? '未分類', requests: [] })
      map.get(key)!.requests.push(r)
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
  }, [filtered])

  const selectedIds = useMemo(() =>
    Object.entries(rowSelection)
      .filter(([, v]) => v)
      .map(([id]) => Number(id)),
    [rowSelection]
  )

  const handleBulkStatus = (newStatus: string) => {
    startTransition(async () => {
      const result = await bulkUpdateStatus(selectedIds, newStatus)
      if (result.error) { toast.error(result.error); return }
      toast.success(`已更新 ${selectedIds.length} 筆狀態`)
      setRowSelection({})
      router.refresh()
    })
  }

  const openEdit = (req: DesignRequest) => {
    setEditTarget(req)
    setEditForm({
      activity_period: req.activity_period ?? '',
      activity_name: req.activity_name,
      purpose: req.purpose,
      size_spec: req.size_spec ?? '',
      quantity: String(req.quantity),
      copywriting: req.copywriting ?? '',
      product_info: req.product_info ?? '',
      deadline: req.deadline ?? '',
      priority: req.priority,
      notes: req.notes ?? '',
    })
  }

  const handleEdit = () => {
    if (!editTarget) return
    startTransition(async () => {
      const result = await updateRequest(editTarget.id, {
        ...editForm,
        quantity: Number(editForm.quantity) || 1,
      })
      if (result.error) { toast.error(result.error); return }
      toast.success('已更新')
      setEditTarget(null)
      router.refresh()
    })
  }

  const columns: ColumnDef<DesignRequest>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
          aria-label="全選"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={v => row.toggleSelected(!!v)}
          aria-label="選取"
          onClick={e => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: 'id',
      header: '#',
      cell: info => <span className="text-muted-foreground text-xs">#{info.getValue<number>()}</span>,
    },
    {
      accessorKey: 'created_at',
      header: '建立日',
      cell: info => <span className="text-sm">{formatDate(info.getValue<string>())}</span>,
    },
    {
      id: 'channel',
      header: '渠道',
      cell: ({ row }) => <span className="text-sm">{row.original.channel?.name ?? '—'}</span>,
    },
    {
      accessorKey: 'activity_name',
      header: '活動名稱',
      cell: ({ row }) => (
        <Link href={`/requests/${row.original.id}`} className="text-sm font-medium hover:text-brand-700 hover:underline">
          {row.original.activity_name}
        </Link>
      ),
    },
    {
      accessorKey: 'purpose',
      header: '用途',
      cell: info => <span className="text-sm">{info.getValue<string>()}</span>,
    },
    {
      accessorKey: 'deadline',
      header: '截止日',
      cell: info => <span className="text-sm">{formatDate(info.getValue<string>())}</span>,
    },
    {
      id: 'requester',
      header: '需求方',
      cell: ({ row }) => {
        const { requesterName } = parseHistoricalNotes(row.original.notes)
        return <span className="text-sm">{row.original.requester?.name ?? row.original.requester_name ?? requesterName ?? '—'}</span>
      },
    },
    {
      id: 'designer',
      header: '設計師',
      cell: ({ row }) => {
        const { designerName } = parseHistoricalNotes(row.original.notes)
        const name = row.original.designer?.name ?? row.original.designer_name ?? designerName
        return <span className="text-sm">{name ?? <span className="text-muted-foreground">未指派</span>}</span>
      },
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: info => (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLOR[info.getValue<string>() as keyof typeof STATUS_COLOR])}>
          {STATUS_LABEL[info.getValue<string>() as keyof typeof STATUS_LABEL]}
        </span>
      ),
    },
    {
      accessorKey: 'priority',
      header: '優先',
      cell: info => <span className="text-xs">{PRIORITY_LABEL[info.getValue<string>() as keyof typeof PRIORITY_LABEL]}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const req = row.original
        const canEdit = isAdmin || req.requester_id === currentProfile.id
        if (!canEdit) return null
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => { e.stopPropagation(); openEdit(req) }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnFilters, rowSelection },
    getRowId: row => String(row.id),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  const exportCSV = () => {
    const headers = ['ID','渠道','活動名稱','用途','尺寸','截止日','需求方','設計師','狀態','優先','建立日']
    const rows = filtered.map(r => [
      r.id, r.channel?.name, r.activity_name, r.purpose, r.size_spec ?? '',
      r.deadline ?? '', r.requester?.name ?? r.requester_name ?? '', r.designer?.name ?? r.designer_name ?? '',
      STATUS_LABEL[r.status], PRIORITY_LABEL[r.priority], formatDate(r.created_at)
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `設計需求_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => { setActiveTab('active'); setStatusFilter('') }}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'active'
              ? 'border-brand-700 text-brand-800'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          進行中需求
          <span className={cn('ml-2 px-1.5 py-0.5 rounded-full text-xs', activeTab === 'active' ? 'bg-brand-100 text-brand-800' : 'bg-muted text-muted-foreground')}>
            {activeCount}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('history'); setStatusFilter(''); if (viewMode === 'kanban') setViewMode('table') }}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'history'
              ? 'border-brand-700 text-brand-800'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          過往完成
          <span className={cn('ml-2 px-1.5 py-0.5 rounded-full text-xs', activeTab === 'history' ? 'bg-brand-100 text-brand-800' : 'bg-muted text-muted-foreground')}>
            {historyCount}
          </span>
        </button>
      </div>

      {/* 篩選工具列 */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="搜尋活動名稱、渠道、需求方…"
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部狀態</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部渠道</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {currentProfile.role !== 'requester' && (
          <select value={designerFilter} onChange={e => setDesignerFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">全部設計師</option>
            {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">共 {filtered.length} 筆</span>
          <Button variant="outline" size="sm" onClick={() => setViewMode('kanban')} className={cn(viewMode === 'kanban' && 'bg-muted')}>
            <Columns className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('table')} className={cn(viewMode === 'table' && 'bg-muted')}>
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('card')} className={cn(viewMode === 'card' && 'bg-muted')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('group')} className={cn(viewMode === 'group' && 'bg-muted')}>
            <Layers className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" />匯出 CSV
          </Button>
        </div>
      </div>

      {/* 批次操作列（有勾選時顯示）*/}
      {selectedIds.length > 0 && isAdmin && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-brand-50 border border-brand-200 rounded-lg">
          <span className="text-sm font-medium text-brand-800">已選 {selectedIds.length} 筆</span>
          <span className="text-muted-foreground text-sm">批次改狀態：</span>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <Button key={v} size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => handleBulkStatus(v)} disabled={isPending}>
              {l}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs"
            onClick={() => setRowSelection({})}>取消選取</Button>
        </div>
      )}

      {/* 看板視圖 */}
      {viewMode === 'kanban' && activeTab === 'active' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {KANBAN_COLS.map(col => {
            const colItems = filtered.filter(r => r.status === col.key)
            return (
              <div key={col.key} className="flex-shrink-0 w-72">
                {/* Column header */}
                <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-t-lg border border-b-0', col.headerBg)}>
                  <span className={cn('w-2 h-2 rounded-full shrink-0', col.dot)} />
                  <span className="font-semibold text-sm">{col.label}</span>
                  <span className="ml-auto text-xs bg-white/70 rounded-full px-2 py-0.5 font-medium">{colItems.length}</span>
                </div>
                {/* Column body */}
                <div className="bg-gray-50 border border-t-0 rounded-b-lg min-h-48 space-y-2.5 p-2.5">
                  {colItems.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">— 無需求 —</div>
                  ) : colItems.map(req => (
                    <Link key={req.id} href={`/requests/${req.id}`}>
                      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer group">
                        {/* Top row: priority + channel */}
                        <div className="flex items-center gap-1.5 flex-wrap min-h-5">
                          {req.priority === 'urgent' && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">緊急</span>
                          )}
                          {req.priority === 'high' && (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">高優先</span>
                          )}
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full ml-auto">{req.channel?.name ?? '未分類'}</span>
                        </div>
                        {/* Title */}
                        <p className="text-sm font-semibold leading-snug group-hover:text-brand-700 line-clamp-2">{req.activity_name}</p>
                        {/* Purpose */}
                        <p className="text-xs text-muted-foreground truncate">{req.purpose}</p>
                        {/* Footer: requester + deadline */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-gray-100 pt-2 mt-1 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {(() => {
                              const { requesterName } = parseHistoricalNotes(req.notes)
                              const name = req.requester?.name ?? req.requester_name ?? requesterName
                              return <>
                                <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-[10px] font-bold shrink-0">
                                  {name?.slice(0,1) ?? '?'}
                                </div>
                                <span className="truncate">{name ?? '—'}</span>
                              </>
                            })()}
                          </div>
                          {req.deadline && (
                            <span className={cn('font-medium shrink-0 text-[11px]', new Date(req.deadline) < new Date() && req.status !== 'completed' ? 'text-red-600 font-bold' : 'text-muted-foreground')}>
                              {formatDate(req.deadline)}
                            </span>
                          )}
                        </div>
                        {/* Designer if assigned */}
                        {req.designer && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 text-[10px] font-bold shrink-0">
                              {req.designer.name?.slice(0,1)}
                            </div>
                            <span className="text-emerald-700 text-[11px]">{req.designer.name}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border bg-white shadow-sm overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer select-none"
                      onClick={header.column.getToggleSortingHandler()}>
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: <ChevronUp className="h-3 w-3" />, desc: <ChevronDown className="h-3 w-3" /> }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="py-12 text-center text-muted-foreground">無符合資料</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}
                    className={cn(
                      'border-b last:border-0 hover:bg-gray-50 transition-colors group',
                      row.getIsSelected() && 'bg-brand-50 hover:bg-brand-50'
                    )}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-3 py-2.5 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <span className="text-xs text-muted-foreground">
              第 {table.getState().pagination.pageIndex + 1} 頁 / 共 {table.getPageCount()} 頁
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>上一頁</Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>下一頁</Button>
            </div>
          </div>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(req => (
            <Link key={req.id} href={`/requests/${req.id}`}>
              <div className="bg-white rounded-lg border hover:shadow-md transition-shadow p-4 space-y-2 h-full">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm leading-tight">{req.activity_name}</span>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', STATUS_COLOR[req.status])}>
                    {STATUS_LABEL[req.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{req.channel?.name} · {req.purpose}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>📅 {formatDate(req.deadline)}</span>
                  <span>👤 {req.requester?.name}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* 渠道分組視圖 */
        <div className="space-y-4">
          {groupedByChannel.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">無符合資料</div>
          ) : groupedByChannel.map(group => (
            <div key={group.name} className="rounded-lg border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <span className="font-semibold text-sm">{group.name}</span>
                <span className="text-xs text-muted-foreground bg-white border rounded-full px-2 py-0.5">{group.requests.length} 筆</span>
              </div>
              <div className="divide-y">
                {group.requests.map(req => (
                  <Link key={req.id} href={`/requests/${req.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-brand-700">
                        {req.activity_name}
                        {req.priority === 'urgent' && <span className="ml-2 text-xs text-red-600">緊急</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.purpose}
                        {req.deadline && ` · 截止 ${formatDate(req.deadline)}`}
                        {req.requester?.name && ` · ${req.requester.name}`}
                      </p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', STATUS_COLOR[req.status])}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 編輯 Dialog */}
      <Dialog open={!!editTarget} onOpenChange={v => !v && setEditTarget(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯需求 #{editTarget?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>活動期間</Label>
                <Input value={editForm.activity_period ?? ''} onChange={e => setEditForm(f => ({ ...f, activity_period: e.target.value }))} placeholder="例：3/6-3/8" />
              </div>
              <div className="space-y-1.5">
                <Label>活動名稱 *</Label>
                <Input value={editForm.activity_name ?? ''} onChange={e => setEditForm(f => ({ ...f, activity_name: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>用途 *</Label>
                <Input value={editForm.purpose ?? ''} onChange={e => setEditForm(f => ({ ...f, purpose: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>尺寸規格</Label>
                <Input value={editForm.size_spec ?? ''} onChange={e => setEditForm(f => ({ ...f, size_spec: e.target.value }))} placeholder="例：1080x1080" />
              </div>
              <div className="space-y-1.5">
                <Label>數量</Label>
                <Input type="number" min={1} value={editForm.quantity ?? '1'} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>最晚交件日</Label>
                <Input type="date" value={editForm.deadline ?? ''} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>優先級</Label>
                <Select value={editForm.priority} onValueChange={v => setEditForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🔴 緊急</SelectItem>
                    <SelectItem value="high">🟠 高</SelectItem>
                    <SelectItem value="normal">🟡 一般</SelectItem>
                    <SelectItem value="low">⚪ 低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>文案內容</Label>
                <Textarea rows={3} className="resize-none" value={editForm.copywriting ?? ''} onChange={e => setEditForm(f => ({ ...f, copywriting: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>產品說明</Label>
                <Textarea rows={3} className="resize-none" value={editForm.product_info ?? ''} onChange={e => setEditForm(f => ({ ...f, product_info: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>備註</Label>
                <Textarea rows={2} className="resize-none" value={editForm.notes ?? ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
              <Button onClick={handleEdit} disabled={isPending} className="bg-brand-800 hover:bg-brand-900 text-white">
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />儲存中…</> : '儲存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
