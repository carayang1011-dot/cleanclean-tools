'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, ExternalLink, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { SyncIndicator } from '@/components/shared/sync-indicator'
import { ExportButton } from '@/components/shared/export-button'
import type { KocWish, KocPlatform, KocCollabType } from '@/lib/types/koc-wish'

const PLATFORMS: KocPlatform[] = ['Instagram', 'YouTube', 'Facebook', 'TikTok', '小紅書', '其他']
const COLLAB_TYPES: KocCollabType[] = ['業配', '團購', '公關品', '開箱', '活動邀請', '待討論']

const STATUS_LABELS: Record<string, string> = {
  '待審核': '待審核',
  '評估中': '評估中',
  '已接洽': '已接洽',
  '已合作': '已合作',
  '不適合': '不適合',
}

const STATUS_COLORS: Record<string, string> = {
  '待審核': 'bg-slate-100 text-slate-700 border-slate-200',
  '評估中': 'bg-amber-50 text-amber-700 border-amber-200',
  '已接洽': 'bg-blue-50 text-blue-700 border-blue-200',
  '已合作': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '不適合': 'bg-red-50 text-red-700 border-red-200',
}

const schema = z.object({
  submittedBy: z.string().min(1, '請填寫姓名'),
  kocName: z.string().min(1, '請填寫 KOC 名稱'),
  platform: z.enum(['Instagram', 'YouTube', 'Facebook', 'TikTok', '小紅書', '其他']),
  kocLink: z.string().min(1, '請填寫帳號連結'),
  followers: z.string().optional().default(''),
  collabType: z.string().optional().default('') as z.ZodType<KocCollabType>,
  product: z.string().min(1, '請填寫合作商品/主題'),
  reason: z.string().optional().default(''),
})

type FormData = z.infer<typeof schema>

export default function KocWishPage() {
  const [data, setData] = useState<KocWish[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<KocWish[]>([])
  const [platformFilter, setPlatformFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      platform: 'Instagram',
      collabType: '' as KocCollabType,
      followers: '',
      reason: '',
    },
  })

  const fetchData = useCallback(async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/sheets/koc-wish')
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

  const onSubmit = async (values: FormData) => {
    try {
      setSyncing(true)
      const res = await fetch('/api/sheets/koc-wish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('新增失敗')
      toast.success('許願單已送出！')
      setOpen(false)
      form.reset()
      await fetchData()
    } catch {
      toast.error('送出失敗，請稍後再試')
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？')) return
    try {
      await fetch('/api/sheets/koc-wish', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      toast.success('已刪除')
      await fetchData()
    } catch { toast.error('刪除失敗') }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`確定刪除選取的 ${selected.length} 筆資料？`)) return
    try {
      await Promise.all(selected.map(row =>
        fetch('/api/sheets/koc-wish', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id }) })
      ))
      toast.success(`已刪除 ${selected.length} 筆`)
      setSelected([])
      await fetchData()
    } catch { toast.error('批次刪除失敗') }
  }

  const uniquePlatforms = useMemo(() => [...new Set(data.map(r => r.platform).filter(Boolean))], [data])
  const uniqueStatuses = useMemo(() => [...new Set(data.map(r => r.status).filter(Boolean))], [data])

  const filteredData = useMemo(() => {
    return data.filter(r => {
      if (platformFilter && r.platform !== platformFilter) return false
      if (statusFilter && r.status !== statusFilter) return false
      return true
    })
  }, [data, platformFilter, statusFilter])

  const columns: ColumnDef<KocWish>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={v => row.toggleSelected(!!v)}
          onClick={e => e.stopPropagation()}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'kocName',
      header: 'KOC 名稱',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.kocName}</p>
          {row.original.kocLink && (
            <a
              href={row.original.kocLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> 查看連結
            </a>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'platform',
      header: '平台',
      cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
    },
    {
      accessorKey: 'followers',
      header: '粉絲數',
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{(getValue() as string) || '—'}</span>,
    },
    {
      accessorKey: 'collabType',
      header: '合作方式',
      cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || '待討論'}</span>,
    },
    {
      accessorKey: 'product',
      header: '合作商品/主題',
      cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
    },
    {
      accessorKey: 'submittedBy',
      header: '許願人',
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: ({ getValue }) => (
        <StatusBadge
          status={getValue() as string}
          colorMap={STATUS_COLORS}
          labelMap={STATUS_LABELS}
        />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: '提交時間',
      cell: ({ getValue }) => {
        const v = getValue() as string
        if (!v) return <span className="text-sm text-muted-foreground">—</span>
        return (
          <span className="text-xs text-muted-foreground">
            {new Date(v).toLocaleDateString('zh-TW')}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => handleDelete(row.original.id)}
        >
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
          <h1 className="text-xl font-bold">合作許願清單</h1>
          <p className="text-sm text-muted-foreground mt-0.5">許願想合作的 KOC，公關團隊會協助接洽</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncIndicator syncing={syncing} lastSynced={lastSynced} />
          <ExportButton
            data={data}
            columns={[
              { key: 'kocName', label: 'KOC名稱' },
              { key: 'platform', label: '平台' },
              { key: 'kocLink', label: '連結' },
              { key: 'followers', label: '粉絲數' },
              { key: 'collabType', label: '合作方式' },
              { key: 'product', label: '商品/主題' },
              { key: 'submittedBy', label: '許願人' },
              { key: 'status', label: '狀態' },
              { key: 'createdAt', label: '提交時間' },
            ]}
            filename="合作許願清單"
          />
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            新增許願
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部平台</option>
          {uniquePlatforms.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部狀態</option>
          {uniqueStatuses.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">已選 {selected.length} 筆</span>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleBulkDelete}>
              刪除選取
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        searchPlaceholder="搜尋 KOC 名稱、許願人..."
        onRowSelectionChange={setSelected}
      />

      {/* Form Dialog */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="新增 合作許願清單"
        form={form}
        onSubmit={onSubmit}
        isLoading={syncing}
        submitLabel="送出許願"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>你的姓名 <span className="text-destructive">*</span></Label>
            <Input {...form.register('submittedBy')} placeholder="請輸入你的名字" />
            {form.formState.errors.submittedBy && (
              <p className="text-xs text-destructive">{form.formState.errors.submittedBy.message}</p>
            )}
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>KOC 名稱 / 帳號暱稱 <span className="text-destructive">*</span></Label>
            <Input {...form.register('kocName')} placeholder="例：小花媽媽の育兒日記" />
            {form.formState.errors.kocName && (
              <p className="text-xs text-destructive">{form.formState.errors.kocName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>社群平台 <span className="text-destructive">*</span></Label>
            <Select
              value={form.watch('platform')}
              onValueChange={v => form.setValue('platform', v as KocPlatform)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>粉絲數（約略）</Label>
            <Input {...form.register('followers')} placeholder="例：3.5萬" />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>帳號連結 <span className="text-destructive">*</span></Label>
            <Input {...form.register('kocLink')} placeholder="https://www.instagram.com/..." />
            {form.formState.errors.kocLink && (
              <p className="text-xs text-destructive">{form.formState.errors.kocLink.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>合作方式</Label>
            <Select
              value={form.watch('collabType') || ''}
              onValueChange={v => form.setValue('collabType', v as KocCollabType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="請選擇" />
              </SelectTrigger>
              <SelectContent>
                {COLLAB_TYPES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>合作商品 / 主題 <span className="text-destructive">*</span></Label>
            <Input {...form.register('product')} placeholder="例：新品洗衣精" />
            {form.formState.errors.product && (
              <p className="text-xs text-destructive">{form.formState.errors.product.message}</p>
            )}
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>許願原因</Label>
            <Textarea
              {...form.register('reason')}
              placeholder="為什麼覺得這位 KOC 適合？"
              className="resize-none"
              rows={3}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
