'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { StatCards } from '@/components/shared/stat-cards'
import { StatusBadge } from '@/components/shared/status-badge'
import { SyncIndicator } from '@/components/shared/sync-indicator'
import { ExportButton } from '@/components/shared/export-button'
import { Calendar, TrendingUp, Users } from 'lucide-react'

interface ScheduleRow {
  id: string
  startDate: string
  endDate: string
  name: string
  platform: string
  type: string
  revenue: string
  orders: string
  avgOrder: string
  commission: string
  status: string
  progress: string
  owner: string
  notes: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  '進行中': 'bg-blue-50 text-blue-700 border-blue-200',
  '已完成': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '規劃中': 'bg-slate-100 text-slate-700 border-slate-200',
  '暫停': 'bg-amber-50 text-amber-700 border-amber-200',
  '取消': 'bg-red-50 text-red-700 border-red-200',
}

const schema = z.object({
  startDate: z.string().min(1, '請填寫開始日期'),
  endDate: z.string().optional().default(''),
  name: z.string().min(1, '請填寫合作名稱'),
  platform: z.string().optional().default(''),
  type: z.string().optional().default(''),
  revenue: z.string().optional().default(''),
  orders: z.string().optional().default(''),
  avgOrder: z.string().optional().default(''),
  commission: z.string().optional().default(''),
  status: z.string().default('規劃中'),
  progress: z.string().optional().default(''),
  owner: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})
type FormData = z.infer<typeof schema>

export default function SchedulePage() {
  const [data, setData] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleRow | null>(null)
  const [selected, setSelected] = useState<ScheduleRow[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: '規劃中' },
  })

  const fetchData = useCallback(async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/sheets/schedule')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json.data ?? [])
      setLastSynced(new Date().toISOString())
    } catch { toast.error('載入資料失敗') }
    finally { setLoading(false); setSyncing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setEditing(null); form.reset({ status: '規劃中' }); setOpen(true) }
  const openEdit = (row: ScheduleRow) => { setEditing(row); form.reset(row as FormData); setOpen(true) }

  const onSubmit = async (values: FormData) => {
    try {
      setSyncing(true)
      const method = editing ? 'PUT' : 'POST'
      const body = editing ? { ...values, id: editing.id } : values
      const res = await fetch('/api/sheets/schedule', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(editing ? '已更新' : '已新增')
      setOpen(false); form.reset(); await fetchData()
    } catch { toast.error('操作失敗') }
    finally { setSyncing(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？')) return
    await fetch('/api/sheets/schedule', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('已刪除'); await fetchData()
  }

  const handleBulkDelete = async () => {
    if (!confirm(`確定刪除選取的 ${selected.length} 筆資料？`)) return
    try {
      await Promise.all(selected.map(row =>
        fetch('/api/sheets/schedule', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id }) })
      ))
      toast.success(`已刪除 ${selected.length} 筆`)
      setSelected([])
      await fetchData()
    } catch { toast.error('批次刪除失敗') }
  }

  const uniqueStatuses = useMemo(() => [...new Set(data.map(r => r.status).filter(Boolean))], [data])
  const uniqueOwners = useMemo(() => [...new Set(data.map(r => r.owner).filter(Boolean))], [data])

  const filteredData = useMemo(() => {
    return data.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false
      if (ownerFilter && r.owner !== ownerFilter) return false
      return true
    })
  }, [data, statusFilter, ownerFilter])

  const totalRevenue = data.reduce((s, r) => s + (parseFloat(r.revenue?.replace(/[^0-9.]/g, '')) || 0), 0)
  const activeCount = data.filter(r => r.status === '進行中').length

  const columns: ColumnDef<ScheduleRow>[] = [
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
    { accessorKey: 'startDate', header: '開始', cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'endDate', header: '結束', cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'name', header: '名稱', cell: ({ getValue }) => <span className="font-medium text-sm">{getValue() as string}</span> },
    { accessorKey: 'platform', header: '平台', cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'type', header: '類型', cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'revenue', header: '業績', cell: ({ getValue }) => <span className="text-sm font-semibold">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'commission', header: '抽成', cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'status', header: '狀態', cell: ({ getValue }) => <StatusBadge status={getValue() as string} colorMap={STATUS_COLORS} /> },
    { accessorKey: 'owner', header: '負責人', cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{(getValue() as string) || '—'}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row.original)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">合作排程</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理 KOC/KOL 合作排程與業績</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncIndicator syncing={syncing} lastSynced={lastSynced} />
          <ExportButton data={data} columns={[
            { key: 'startDate', label: '開始' }, { key: 'endDate', label: '結束' }, { key: 'name', label: '名稱' },
            { key: 'platform', label: '平台' }, { key: 'type', label: '類型' }, { key: 'revenue', label: '業績' },
            { key: 'orders', label: '訂單' }, { key: 'commission', label: '抽成' }, { key: 'status', label: '狀態' },
            { key: 'owner', label: '負責人' }, { key: 'notes', label: '備註' },
          ]} filename="合作排程" />
          <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />新增</Button>
        </div>
      </div>

      <StatCards cards={[
        { label: '總合作數', value: data.length, icon: Calendar },
        { label: '進行中', value: activeCount, icon: TrendingUp, iconClassName: 'bg-blue-50 text-blue-600' },
        { label: '總業績', value: totalRevenue > 0 ? `NT$ ${totalRevenue.toLocaleString()}` : '—', icon: Users },
        { label: '已完成', value: data.filter(r => r.status === '已完成').length, icon: Calendar, iconClassName: 'bg-emerald-50 text-emerald-600' },
      ]} />

      <div className="flex items-center gap-2 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部狀態</option>
          {uniqueStatuses.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部負責人</option>
          {uniqueOwners.map(v => <option key={v} value={v}>{v}</option>)}
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

      <DataTable columns={columns} data={filteredData} loading={loading} searchPlaceholder="搜尋合作名稱、平台..." onRowSelectionChange={setSelected} />

      <FormDialog open={open} onOpenChange={setOpen} title={editing ? '編輯合作排程' : '新增合作排程'} form={form} onSubmit={onSubmit} isLoading={syncing}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label>合作名稱 *</Label><Input {...form.register('name')} placeholder="例：Vina 洗衣精團購" />{form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div>
          <div className="space-y-1.5"><Label>開始日期 *</Label><Input {...form.register('startDate')} type="date" /></div>
          <div className="space-y-1.5"><Label>結束日期</Label><Input {...form.register('endDate')} type="date" /></div>
          <div className="space-y-1.5"><Label>平台</Label><Input {...form.register('platform')} placeholder="IG / FB / YT..." /></div>
          <div className="space-y-1.5"><Label>類型</Label><Input {...form.register('type')} placeholder="業配 / 團購 / 公關品" /></div>
          <div className="space-y-1.5"><Label>業績</Label><Input {...form.register('revenue')} placeholder="NT$ 50,000" /></div>
          <div className="space-y-1.5"><Label>訂單數</Label><Input {...form.register('orders')} placeholder="120" /></div>
          <div className="space-y-1.5"><Label>抽成</Label><Input {...form.register('commission')} placeholder="10%" /></div>
          <div className="space-y-1.5"><Label>負責人</Label><Input {...form.register('owner')} placeholder="Cara" /></div>
          <div className="space-y-1.5"><Label>狀態</Label>
            <Select value={form.watch('status')} onValueChange={v => form.setValue('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['規劃中', '進行中', '已完成', '暫停', '取消'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>進度</Label><Input {...form.register('progress')} placeholder="例：已寄送試用品" /></div>
          <div className="col-span-2 space-y-1.5"><Label>備註</Label><Textarea {...form.register('notes')} className="resize-none" rows={2} /></div>
        </div>
      </FormDialog>
    </div>
  )
}
