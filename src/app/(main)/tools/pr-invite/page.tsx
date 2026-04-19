'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import { Trash2, ExternalLink, Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { SyncIndicator } from '@/components/shared/sync-indicator'
import { ExportButton } from '@/components/shared/export-button'

interface PrInvite {
  id: string
  name: string
  platform: string
  accountLink: string
  followers: string
  email: string
  phone: string
  address: string
  product: string
  notes: string
  status: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  '待審核': 'bg-slate-100 text-slate-700 border-slate-200',
  '已邀約': 'bg-blue-50 text-blue-700 border-blue-200',
  '已確認': 'bg-amber-50 text-amber-700 border-amber-200',
  '已寄出': 'bg-violet-50 text-violet-700 border-violet-200',
  '已收到': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '婉拒':   'bg-red-50 text-red-700 border-red-200',
}

const STATUSES = Object.keys(STATUS_COLORS)

const publicFormUrl = typeof window !== 'undefined'
  ? `${window.location.origin}/forms/pr-invite`
  : '/forms/pr-invite'

export default function PrInvitePage() {
  const [data,        setData]        = useState<PrInvite[]>([])
  const [loading,     setLoading]     = useState(true)
  const [syncing,     setSyncing]     = useState(false)
  const [lastSynced,  setLastSynced]  = useState<string | null>(null)
  const [selected,    setSelected]    = useState<PrInvite[]>([])
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/sheets/pr-invite')
      if (!res.ok) throw new Error('載入失敗')
      const json = await res.json()
      setData(json.data ?? [])
      setLastSynced(new Date().toISOString())
    } catch {
      toast.error('載入資料失敗')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/sheets/pr-invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error()
      toast.success('狀態已更新')
      await fetchData()
    } catch {
      toast.error('更新失敗')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？')) return
    try {
      await fetch('/api/sheets/pr-invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      toast.success('已刪除')
      await fetchData()
    } catch { toast.error('刪除失敗') }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicFormUrl)
    toast.success('連結已複製！')
  }

  const filteredData = useMemo(() =>
    data.filter(r => !statusFilter || r.status === statusFilter),
    [data, statusFilter]
  )

  const columns: ColumnDef<PrInvite>[] = [
    {
      accessorKey: 'name',
      header: '姓名',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          {row.original.accountLink && (
            <a href={row.original.accountLink} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline">
              <ExternalLink className="h-3 w-3" />{row.original.platform || '連結'}
            </a>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'followers',
      header: '粉絲數',
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{(getValue() as string) || '—'}</span>,
    },
    {
      accessorKey: 'email',
      header: '聯絡方式',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {row.original.email && <p>{row.original.email}</p>}
          {row.original.phone && <p>{row.original.phone}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: '收貨地址',
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground max-w-[160px] block truncate" title={getValue() as string}>{(getValue() as string) || '—'}</span>,
    },
    {
      accessorKey: 'product',
      header: '感興趣商品',
      cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || '—'}</span>,
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: ({ row }) => (
        <select
          value={row.original.status}
          onChange={e => handleStatusChange(row.original.id, e.target.value)}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: '填表時間',
      cell: ({ getValue }) => {
        const v = getValue() as string
        if (!v) return <span className="text-xs text-muted-foreground">—</span>
        return <span className="text-xs text-muted-foreground">{new Date(v).toLocaleDateString('zh-TW')}</span>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => handleDelete(row.original.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">公關邀約管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">KOL / KOC 公關邀約資料彙整</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncIndicator syncing={syncing} lastSynced={lastSynced} />
          <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyLink}>
            <Copy className="h-3.5 w-3.5" />
            複製填表連結
          </Button>
          <ExportButton
            data={data}
            columns={[
              { key: 'name',        label: '姓名' },
              { key: 'platform',    label: '平台' },
              { key: 'accountLink', label: '帳號連結' },
              { key: 'followers',   label: '粉絲數' },
              { key: 'email',       label: 'Email' },
              { key: 'phone',       label: '電話' },
              { key: 'address',     label: '收貨地址' },
              { key: 'product',     label: '感興趣商品' },
              { key: 'notes',       label: '備註' },
              { key: 'status',      label: '狀態' },
              { key: 'createdAt',   label: '填表時間' },
            ]}
            filename="公關邀約名單"
          />
        </div>
      </div>

      {/* 公開填表連結提示 */}
      <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
        <span className="text-rose-500 text-lg">🔗</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-rose-800">公開填表連結</p>
          <p className="text-xs text-rose-600 truncate">{publicFormUrl}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-100 shrink-0" onClick={handleCopyLink}>
          <Copy className="h-3.5 w-3.5 mr-1" /> 複製
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部狀態</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {selected.length > 0 && (
          <span className="text-sm text-muted-foreground ml-2">已選 {selected.length} 筆</span>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        searchPlaceholder="搜尋姓名、Email..."
        onRowSelectionChange={setSelected}
      />
    </div>
  )
}
