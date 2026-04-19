'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import {
  Plus, Pencil, Trash2, DollarSign, Clock, CheckCircle2, ListChecks, Banknote
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/shared/data-table'
import { StatCards } from '@/components/shared/stat-cards'
import { FormDialog } from '@/components/shared/form-dialog'
import { ExportButton } from '@/components/shared/export-button'
import { cn } from '@/lib/utils'

interface Remittance {
  id: number
  month: string
  due_date: string | null
  paid_date: string | null
  confirmed: boolean
  invoice: string | null
  amount: number | null
  bank_info: string | null
  content: string
  notes: string | null
  account_name: string | null
  collab_name: string | null
  is_paid: boolean
  created_at: string
  updated_at: string
}

const schema = z.object({
  month:        z.string().min(1, '請填寫月份'),
  content:      z.string().min(1, '請填寫對象/內容'),
  amount:       z.string().optional().default(''),
  due_date:     z.string().optional().default(''),
  paid_date:    z.string().optional().default(''),
  invoice:      z.string().optional().default(''),
  confirmed:    z.boolean().default(false),
  is_paid:      z.boolean().default(false),
  account_name: z.string().optional().default(''),
  collab_name:  z.string().optional().default(''),
  bank_info:    z.string().optional().default(''),
  notes:        z.string().optional().default(''),
})

type FormData = z.infer<typeof schema>

function currentMonth(): string {
  const now = new Date()
  const roc = now.getFullYear() - 1911
  const m   = String(now.getMonth() + 1).padStart(2, '0')
  return `${roc}.${m}`
}

export default function PaymentPage() {
  const [data,         setData]         = useState<Remittance[]>([])
  const [months,       setMonths]       = useState<string[]>([])
  const [loading,      setLoading]      = useState(true)
  const [open,         setOpen]         = useState(false)
  const [editing,      setEditing]      = useState<Remittance | null>(null)
  const [selected,     setSelected]     = useState<Remittance[]>([])
  const [filterMonth,  setFilterMonth]  = useState('all')
  const [filterPaid,   setFilterPaid]   = useState('all')

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { month: currentMonth(), confirmed: false, is_paid: false },
  })

  const fetchMonths = useCallback(async () => {
    const res = await fetch('/api/remittances?month=&paid=')
    if (!res.ok) return
    const json = await res.json()
    const all: Remittance[] = json.data ?? []
    const unique = [...new Set(all.map(r => r.month))].sort((a, b) => {
      const parse = (m: string) => {
        const clean = m.replace('月', '')
        const [y, mo] = clean.split('.')
        return parseInt(y) * 100 + parseInt(mo ?? '0')
      }
      return parse(b) - parse(a)
    })
    setMonths(unique)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterMonth && filterMonth !== 'all') params.set('month', filterMonth)
      if (filterPaid  && filterPaid  !== 'all') params.set('paid',  filterPaid)
      const res = await fetch(`/api/remittances?${params}`)
      if (!res.ok) throw new Error('載入失敗')
      const json = await res.json()
      setData(json.data ?? [])
    } catch {
      toast.error('載入資料失敗')
    } finally {
      setLoading(false)
    }
  }, [filterMonth, filterPaid])

  useEffect(() => { fetchMonths() }, [fetchMonths])
  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    form.reset({ month: currentMonth(), confirmed: false, is_paid: false })
    setOpen(true)
  }

  const openEdit = (row: Remittance) => {
    setEditing(row)
    form.reset({
      month:        row.month,
      content:      row.content,
      amount:       row.amount != null ? String(row.amount) : '',
      due_date:     row.due_date ?? '',
      paid_date:    row.paid_date ?? '',
      invoice:      row.invoice ?? '',
      confirmed:    row.confirmed,
      is_paid:      row.is_paid,
      account_name: row.account_name ?? '',
      collab_name:  row.collab_name ?? '',
      bank_info:    row.bank_info ?? '',
      notes:        row.notes ?? '',
    })
    setOpen(true)
  }

  const onSubmit = async (values: FormData) => {
    try {
      const body = {
        ...values,
        amount: values.amount ? parseFloat(values.amount) : null,
        ...(editing ? { id: editing.id } : {}),
      }
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch('/api/remittances', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '操作失敗')
      }
      toast.success(editing ? '已更新' : '已新增')
      setOpen(false)
      form.reset()
      await Promise.all([fetchData(), fetchMonths()])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失敗')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('確定刪除這筆記錄？')) return
    const res = await fetch('/api/remittances', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { toast.error('刪除失敗'); return }
    toast.success('已刪除')
    await fetchData()
  }

  const batchMarkPaid = async () => {
    const unpaid = selected.filter(r => !r.is_paid)
    if (unpaid.length === 0) return
    await Promise.all(
      unpaid.map(r =>
        fetch('/api/remittances', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: r.id, is_paid: true, paid_date: new Date().toISOString().slice(0, 10) }),
        })
      )
    )
    toast.success(`已標記 ${unpaid.length} 筆為已付款`)
    setSelected([])
    await fetchData()
  }

  // Stats
  const totalAmount  = data.reduce((s, r) => s + (r.amount ?? 0), 0)
  const unpaidAmount = data.filter(r => !r.is_paid).reduce((s, r) => s + (r.amount ?? 0), 0)
  const paidCount    = data.filter(r => r.is_paid).length
  const pendingCount = data.filter(r => !r.is_paid).length

  const columns: ColumnDef<Remittance>[] = [
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
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'month',
      header: '月份',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: 'content',
      header: '對象/內容',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.content}</div>
          {row.original.collab_name && (
            <div className="text-xs text-muted-foreground">{row.original.collab_name}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: '金額',
      cell: ({ getValue }) => {
        const v = getValue() as number | null
        return v != null
          ? <span className="font-semibold text-sm">NT$ {v.toLocaleString()}</span>
          : <span className="text-muted-foreground text-sm">—</span>
      },
    },
    {
      accessorKey: 'account_name',
      header: '受款戶名',
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as string | null) || '—'}</span>
      ),
    },
    {
      accessorKey: 'due_date',
      header: '應付期',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{(getValue() as string | null) || '—'}</span>
      ),
    },
    {
      accessorKey: 'paid_date',
      header: '付款日',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{(getValue() as string | null) || '—'}</span>
      ),
    },
    {
      accessorKey: 'invoice',
      header: '發票/單號',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{(getValue() as string | null) || '—'}</span>
      ),
    },
    {
      accessorKey: 'is_paid',
      header: '狀態',
      cell: ({ getValue, row }) => {
        const paid = getValue() as boolean
        return (
          <div className="flex items-center gap-1">
            <span className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
              paid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            )}>
              {paid ? '已付款' : '未付款'}
            </span>
            {row.original.confirmed && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                已確認
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">匯款管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">追蹤付款狀態與歷史匯款紀錄</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <ExportButton
            data={data}
            columns={[
              { key: 'month',        label: '月份' },
              { key: 'content',      label: '對象/內容' },
              { key: 'collab_name',  label: '合作對象' },
              { key: 'amount',       label: '金額' },
              { key: 'account_name', label: '受款戶名' },
              { key: 'due_date',     label: '應付期' },
              { key: 'paid_date',    label: '付款日' },
              { key: 'invoice',      label: '發票/單號' },
              { key: 'is_paid',      label: '已付款' },
              { key: 'confirmed',    label: '已確認' },
              { key: 'bank_info',    label: '匯款資訊' },
              { key: 'notes',        label: '備註' },
            ]}
            filename="匯款管理"
          />
          {selected.filter(r => !r.is_paid).length > 0 && (
            <Button size="sm" variant="outline" className="gap-2" onClick={batchMarkPaid}>
              <ListChecks className="h-4 w-4" />
              標記已付款 ({selected.filter(r => !r.is_paid).length})
            </Button>
          )}
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新增
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatCards
        cards={[
          {
            label: '總筆數',
            value: data.length,
            icon: Banknote,
            subtext: filterMonth !== 'all' ? filterMonth : '所有月份',
          },
          {
            label: '未付款金額',
            value: `NT$ ${unpaidAmount.toLocaleString()}`,
            icon: DollarSign,
            iconClassName: 'bg-red-50 text-red-600',
            subtext: `${pendingCount} 筆`,
            trend: 'down',
          },
          {
            label: '已付款',
            value: paidCount,
            icon: CheckCircle2,
            iconClassName: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: '總金額',
            value: `NT$ ${totalAmount.toLocaleString()}`,
            icon: Clock,
            iconClassName: 'bg-blue-50 text-blue-600',
          },
        ]}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">月份</span>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="全部月份" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部月份</SelectItem>
              {months.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">狀態</span>
          <Select value={filterPaid} onValueChange={setFilterPaid}>
            <SelectTrigger className="h-8 w-28 text-sm">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="false">未付款</SelectItem>
              <SelectItem value="true">已付款</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchPlaceholder="搜尋對象、戶名、合作對象..."
        onRowSelectionChange={setSelected}
      />

      {/* Form Dialog */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? '編輯匯款記錄' : '新增匯款記錄'}
        form={form}
        onSubmit={onSubmit}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>月份 <span className="text-destructive">*</span></Label>
            <Input {...form.register('month')} placeholder="例：115.04" />
            {form.formState.errors.month && (
              <p className="text-xs text-destructive">{form.formState.errors.month.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>金額</Label>
            <Input {...form.register('amount')} placeholder="例：5000" type="number" step="0.01" />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>對象/內容 <span className="text-destructive">*</span></Label>
            <Input {...form.register('content')} placeholder="例：Vina_團購分潤" />
            {form.formState.errors.content && (
              <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>合作對象名稱</Label>
            <Input {...form.register('collab_name')} placeholder="例：Vina" />
          </div>

          <div className="space-y-1.5">
            <Label>受款戶名</Label>
            <Input {...form.register('account_name')} placeholder="例：陳慧靜" />
          </div>

          <div className="space-y-1.5">
            <Label>應付期</Label>
            <Input {...form.register('due_date')} placeholder="例：4/10前" />
          </div>

          <div className="space-y-1.5">
            <Label>付款日</Label>
            <Input {...form.register('paid_date')} type="date" />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>發票/單號</Label>
            <Input {...form.register('invoice')} placeholder="發票號碼或勞報單說明" />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>匯款資訊</Label>
            <Textarea {...form.register('bank_info')} placeholder="銀行帳號、戶名等" className="resize-none" rows={3} />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>備註</Label>
            <Textarea {...form.register('notes')} placeholder="其他說明" className="resize-none" rows={2} />
          </div>

          <div className="flex items-center gap-6 col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.watch('is_paid')}
                onCheckedChange={v => form.setValue('is_paid', !!v)}
              />
              <span className="text-sm">已付款</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.watch('confirmed')}
                onCheckedChange={v => form.setValue('confirmed', !!v)}
              />
              <span className="text-sm">文件已確認</span>
            </label>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
