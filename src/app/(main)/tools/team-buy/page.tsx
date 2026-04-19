'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, ShoppingCart, CheckCircle2, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/shared/data-table'
import { StatCards } from '@/components/shared/stat-cards'
import { FormDialog } from '@/components/shared/form-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { SyncIndicator } from '@/components/shared/sync-indicator'
import { ExportButton } from '@/components/shared/export-button'

interface TeamBuyRow {
  id: string
  year: string
  openDate: string
  kol: string
  status: string
  discount: string
  source: string
  system: string
  owner: string
  commission: string
  notes: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  '進行中': 'bg-blue-50 text-blue-700 border-blue-200',
  '已結束': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '待開始': 'bg-slate-100 text-slate-700 border-slate-200',
  '取消': 'bg-red-50 text-red-700 border-red-200',
}

const schema = z.object({
  year: z.string().optional().default(String(new Date().getFullYear())),
  openDate: z.string().min(1, '請填寫開團日期'),
  kol: z.string().min(1, '請填寫 KOL'),
  status: z.string().default('待開始'),
  discount: z.string().optional().default(''),
  source: z.string().optional().default(''),
  system: z.string().optional().default(''),
  owner: z.string().optional().default(''),
  commission: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})
type FormData = z.infer<typeof schema>

export default function TeamBuyPage() {
  const [data, setData] = useState<TeamBuyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TeamBuyRow | null>(null)
  const [selected, setSelected] = useState<TeamBuyRow[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: '待開始', year: String(new Date().getFullYear()) },
  })

  const fetchData = useCallback(async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/sheets/team-buy')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json.data ?? [])
      setLastSynced(new Date().toISOString())
    } catch { toast.error('載入資料失敗') }
    finally { setLoading(false); setSyncing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setEditing(null); form.reset({ status: '待開始', year: String(new Date().getFullYear()) }); setOpen(true) }
  const openEdit = (row: TeamBuyRow) => { setEditing(row); form.reset(row as FormData); setOpen(true) }

  const onSubmit = async (values: FormData) => {
    try {
      setSyncing(true)
      const method = editing ? 'PUT' : 'POST'
      const body = editing ? { ...values, id: editing.id } : values
      const res = await fetch('/api/sheets/team-buy', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      toast.success(editing ? '已更新' : '已新增')
      setOpen(false); form.reset(); await fetchData()
    } catch { toast.error('操作失敗') }
    finally { setSyncing(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？')) return
    await fetch('/api/sheets/team-buy', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('已刪除'); await fetchData()
  }

  const handleBulkDelete = async () => {
    if (!confirm(`確定刪除選取的 ${selected.length} 筆資料？`)) return
    try {
      await Promise.all(selected.map(row =>
        fetch('/api/sheets/team-buy', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id }) })
      ))
      toast.success(`已刪除 ${selected.length} 筆`)
      setSelected([])
      await fetchData()
    } catch { toast.error('批次刪除失敗') }
  }

  const uniqueStatuses = useMemo(() => [...new Set(data.map(r => r.status).filter(Boolean))], [data])
  const uniqueYears = useMemo(() => [...new Set(data.map(r => r.year).filter(Boolean))].sort().reverse(), [data])

  const filteredData = useMemo(() => {
    return data.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false
      if (yearFilter && r.year !== yearFilter) return false
      return true
    })
  }, [data, statusFilter, yearFilter])

  const columns: ColumnDef<TeamBuyRow>[] = [
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
    { accessorKey: 'year', header: '年度', cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'openDate', header: '開團日期', cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span> },
    { accessorKey: 'kol', header: 'KOL', cell: ({ getValue }) => <span className="font-medium text-sm">{getValue() as string}</span> },
    { accessorKey: 'status', header: '狀態', cell: ({ getValue }) => <StatusBadge status={getValue() as string} colorMap={STATUS_COLORS} /> },
    { accessorKey: 'discount', header: '折扣', cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'source', header: '來源', cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'system', header: '系統', cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'owner', header: '負責人', cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'commission', header: '分潤%', cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || '—'}</span> },
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
          <h1 className="text-xl font-bold">團購紀錄</h1>
          <p className="text-sm text-muted-foreground mt-0.5">KOL/KOC 團購合作紀錄管理</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncIndicator syncing={syncing} lastSynced={lastSynced} />
          <ExportButton data={data} columns={[
            { key: 'year', label: '年度' }, { key: 'openDate', label: '開團日期' }, { key: 'kol', label: 'KOL' },
            { key: 'status', label: '狀態' }, { key: 'discount', label: '折扣' }, { key: 'source', label: '來源' },
            { key: 'commission', label: '分潤%' }, { key: 'owner', label: '負責人' }, { key: 'notes', label: '備註' },
          ]} filename="團購紀錄" />
          <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />新增</Button>
        </div>
      </div>

      <StatCards cards={[
        { label: '總筆數', value: data.length, icon: ShoppingCart },
        { label: '進行中', value: data.filter(r => r.status === '進行中').length, icon: Clock, iconClassName: 'bg-blue-50 text-blue-600' },
        { label: '已結束', value: data.filter(r => r.status === '已結束').length, icon: CheckCircle2, iconClassName: 'bg-emerald-50 text-emerald-600' },
        { label: '今年開團', value: data.filter(r => r.year === String(new Date().getFullYear())).length, icon: ShoppingCart },
      ]} />

      <div className="flex items-center gap-2 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部狀態</option>
          {uniqueStatuses.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部年度</option>
          {uniqueYears.map(v => <option key={v} value={v}>{v}</option>)}
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

      <DataTable columns={columns} data={filteredData} loading={loading} searchPlaceholder="搜尋 KOL、來源..." onRowSelectionChange={setSelected} />

      <FormDialog open={open} onOpenChange={setOpen} title={editing ? '編輯團購紀錄' : '新增團購紀錄'} form={form} onSubmit={onSubmit} isLoading={syncing}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>年度</Label><Input {...form.register('year')} placeholder="2026" /></div>
          <div className="space-y-1.5"><Label>開團日期 *</Label><Input {...form.register('openDate')} type="date" />{form.formState.errors.openDate && <p className="text-xs text-destructive">{form.formState.errors.openDate.message}</p>}</div>
          <div className="col-span-2 space-y-1.5"><Label>KOL *</Label><Input {...form.register('kol')} placeholder="KOL 名稱" />{form.formState.errors.kol && <p className="text-xs text-destructive">{form.formState.errors.kol.message}</p>}</div>
          <div className="space-y-1.5"><Label>狀態</Label>
            <Select value={form.watch('status')} onValueChange={v => form.setValue('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['待開始', '進行中', '已結束', '取消'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>折扣</Label><Input {...form.register('discount')} placeholder="85折" /></div>
          <div className="space-y-1.5"><Label>來源</Label><Input {...form.register('source')} placeholder="IG / 小紅書" /></div>
          <div className="space-y-1.5"><Label>系統</Label><Input {...form.register('system')} placeholder="蝦皮 / 官網" /></div>
          <div className="space-y-1.5"><Label>負責人</Label><Input {...form.register('owner')} placeholder="Cara" /></div>
          <div className="space-y-1.5"><Label>分潤%</Label><Input {...form.register('commission')} placeholder="10%" /></div>
          <div className="col-span-2 space-y-1.5"><Label>備註</Label><Textarea {...form.register('notes')} className="resize-none" rows={2} /></div>
        </div>
      </FormDialog>
    </div>
  )
}
