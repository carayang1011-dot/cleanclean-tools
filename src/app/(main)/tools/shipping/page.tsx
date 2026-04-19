'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Send, ChevronDown, ChevronRight, Package, MapPin } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { SyncIndicator } from '@/components/shared/sync-indicator'
import { ExportButton } from '@/components/shared/export-button'
import { cn } from '@/lib/utils'
import type { Shipment, ShipmentProduct, TmsStatus } from '@/lib/types/shipping'

const TMS_STATUS_COLORS: Record<string, string> = {
  pending:    'bg-slate-100 text-slate-700 border-slate-200',
  tms_sent:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  tms_failed: 'bg-red-50 text-red-700 border-red-200',
}

const TMS_STATUS_LABELS: Record<string, string> = {
  pending:    '未同步',
  tms_sent:   'TMS 已送出',
  tms_failed: 'TMS 失敗',
}

const productSchema = z.object({
  n: z.string().min(1, '請填寫品名'),
  s: z.string().min(1, '請填寫 SKU'),
  q: z.coerce.number().min(1, '數量至少 1'),
})

const schema = z.object({
  campaign: z.string().min(1, '請填寫活動名稱'),
  date: z.string().min(1, '請填寫日期'),
  source: z.string().optional().default(''),
  orderNo: z.string().min(1, '請填寫訂單編號'),
  recipient: z.string().min(1, '請填寫收件人'),
  phone: z.string().min(1, '請填寫電話'),
  address: z.string().min(1, '請填寫地址'),
  notes: z.string().optional().default(''),
  products: z.array(productSchema).min(1, '請至少新增一項品項'),
})

type FormData = z.infer<typeof schema>

function parseProducts(raw: string | ShipmentProduct[]): ShipmentProduct[] {
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

function ExpandedRow({ shipment }: { shipment: Shipment }) {
  const products = parseProducts(shipment.products)
  return (
    <div className="px-6 py-4 bg-muted/20 border-t border-border">
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">地址</p>
          <p className="text-sm flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            {shipment.address}
          </p>
        </div>
        {shipment.notes && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">備註</p>
            <p className="text-sm text-amber-700 bg-amber-50 rounded px-2 py-1">{shipment.notes}</p>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">品項明細</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">品名</th>
              <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">SKU</th>
              <th className="text-right text-xs text-muted-foreground font-medium py-1.5">數量</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 pr-4">{p.n}</td>
                <td className="py-1.5 pr-4 font-mono text-xs text-muted-foreground">{p.s}</td>
                <td className="py-1.5 text-right font-semibold">{p.q}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shipment.tmsOrderId && (
        <p className="mt-3 text-xs text-muted-foreground">TMS 訂單號：<span className="font-mono">{shipment.tmsOrderId}</span></p>
      )}
    </div>
  )
}

export default function ShippingPage() {
  const [data, setData] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [tmsSubmitting, setTmsSubmitting] = useState<string | null>(null)
  const [selected, setSelected] = useState<Shipment[]>([])
  const [campaignFilter, setCampaignFilter] = useState('')
  const [tmsFilter, setTmsFilter] = useState('')

  const uniqueCampaigns = useMemo(() => [...new Set(data.map(r => r.campaign).filter(Boolean))], [data])
  const filteredData = useMemo(() => {
    let d = data
    if (campaignFilter) d = d.filter(r => r.campaign === campaignFilter)
    if (tmsFilter) d = d.filter(r => (r.tmsStatus || 'pending') === tmsFilter)
    return d
  }, [data, campaignFilter, tmsFilter])

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？')) return
    await fetch('/api/sheets/shipping', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('已刪除'); await fetchData()
  }

  const handleBulkDelete = async () => {
    if (!confirm(`確定刪除 ${selected.length} 筆？`)) return
    setSyncing(true)
    await Promise.all(selected.map(r =>
      fetch('/api/sheets/shipping', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id }) })
    ))
    toast.success(`已刪除 ${selected.length} 筆`)
    setSelected([])
    await fetchData()
    setSyncing(false)
  }

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      source: 'AA002-2',
      products: [{ n: '', s: '', q: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'products' })

  const fetchData = useCallback(async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/sheets/shipping')
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
      const res = await fetch('/api/sheets/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('新增失敗')
      toast.success('寄件紀錄已新增')
      setOpen(false)
      form.reset()
      await fetchData()
    } catch {
      toast.error('新增失敗，請稍後再試')
    } finally {
      setSyncing(false)
    }
  }

  const handleTmsSubmit = async (id: string) => {
    if (!confirm('確定要推送此訂單到 TMS 嗎？')) return
    setTmsSubmitting(id)
    try {
      const res = await fetch('/api/tms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`TMS 送出成功！訂單號：${json.tmsOrderId}`)
      await fetchData()
    } catch (e) {
      toast.error(`TMS 送出失敗：${e instanceof Error ? e.message : '未知錯誤'}`)
    } finally {
      setTmsSubmitting(null)
    }
  }

  const columns: ColumnDef<Shipment>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)} />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onCheckedChange={v => row.toggleSelected(!!v)} onClick={e => e.stopPropagation()} />
      ),
      enableSorting: false,
    },
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => setExpandedRow(expandedRow === row.original.id ? null : row.original.id)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {expandedRow === row.original.id
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />
          }
        </button>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'campaign',
      header: '活動',
      cell: ({ getValue }) => <span className="font-semibold text-sm text-primary">{getValue() as string}</span>,
    },
    {
      accessorKey: 'date',
      header: '日期',
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: 'orderNo',
      header: '訂單編號',
      cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: 'recipient',
      header: '收件人',
      cell: ({ getValue }) => <span className="font-medium text-sm">{getValue() as string}</span>,
    },
    {
      accessorKey: 'phone',
      header: '電話',
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue() as string}</span>,
    },
    {
      id: 'products_summary',
      header: '品項',
      cell: ({ row }) => {
        const products = parseProducts(row.original.products)
        return (
          <div className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{products.length} 項</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'tmsStatus',
      header: 'TMS 狀態',
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.tmsStatus || 'pending'}
          colorMap={TMS_STATUS_COLORS}
          labelMap={TMS_STATUS_LABELS}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const status = row.original.tmsStatus as TmsStatus
        return (
          <div className="flex items-center gap-1">
            {status !== 'tms_sent' && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                disabled={tmsSubmitting === row.original.id}
                onClick={() => handleTmsSubmit(row.original.id)}>
                <Send className="h-3 w-3" />推送
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => handleDelete(row.original.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">公關品寄件管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理公關品寄件記錄與 TMS 物流系統</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <SyncIndicator syncing={syncing} lastSynced={lastSynced} />
          <ExportButton
            data={data}
            columns={[
              { key: 'campaign', label: '活動' },
              { key: 'date', label: '日期' },
              { key: 'orderNo', label: '訂單編號' },
              { key: 'recipient', label: '收件人' },
              { key: 'phone', label: '電話' },
              { key: 'address', label: '地址' },
              { key: 'notes', label: '備註' },
              { key: 'tmsStatus', label: 'TMS狀態' },
            ]}
            filename="公關品寄件"
          />
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            新增寄件
          </Button>
        </div>
      </div>

      {/* 篩選工具列 */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部活動</option>
          {uniqueCampaigns.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={tmsFilter} onChange={e => setTmsFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">全部TMS狀態</option>
          <option value="pending">未同步</option>
          <option value="tms_sent">TMS 已送出</option>
          <option value="tms_failed">TMS 失敗</option>
        </select>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">已選 {selected.length} 筆</span>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleBulkDelete}>刪除選取</Button>
          </div>
        )}
      </div>

      {/* Table with expandable rows */}
      <div className="space-y-3">
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          searchPlaceholder="搜尋收件人、訂單編號、活動..."
          onRowSelectionChange={setSelected}
        />
        {/* Expanded rows */}
        {data.filter(r => r.id === expandedRow).map(shipment => (
          <div key={shipment.id} className="rounded-lg border border-primary/30 overflow-hidden -mt-3">
            <ExpandedRow shipment={shipment} />
          </div>
        ))}
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="新增寄件記錄"
        form={form}
        onSubmit={onSubmit}
        isLoading={syncing}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>活動名稱 <span className="text-destructive">*</span></Label>
              <Input {...form.register('campaign')} placeholder="例：潔顏三部曲創作者計畫" />
              {form.formState.errors.campaign && (
                <p className="text-xs text-destructive">{form.formState.errors.campaign.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>日期 <span className="text-destructive">*</span></Label>
              <Input {...form.register('date')} type="date" />
            </div>

            <div className="space-y-1.5">
              <Label>來源代號</Label>
              <Input {...form.register('source')} placeholder="AA002-2" />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>訂單編號 <span className="text-destructive">*</span></Label>
              <Input {...form.register('orderNo')} placeholder="例：11504070023" />
              {form.formState.errors.orderNo && (
                <p className="text-xs text-destructive">{form.formState.errors.orderNo.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>收件人 <span className="text-destructive">*</span></Label>
              <Input {...form.register('recipient')} placeholder="收件人姓名" />
              {form.formState.errors.recipient && (
                <p className="text-xs text-destructive">{form.formState.errors.recipient.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>電話 <span className="text-destructive">*</span></Label>
              <Input {...form.register('phone')} placeholder="0912345678" />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>地址 <span className="text-destructive">*</span></Label>
              <Input {...form.register('address')} placeholder="完整收件地址" />
              {form.formState.errors.address && (
                <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>備註</Label>
              <Textarea {...form.register('notes')} placeholder="備註事項" className="resize-none" rows={2} />
            </div>
          </div>

          {/* Products */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>品項 <span className="text-destructive">*</span></Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => append({ n: '', s: '', q: 1 })}
              >
                <Plus className="h-3 w-3" /> 新增品項
              </Button>
            </div>
            {form.formState.errors.products?.root && (
              <p className="text-xs text-destructive">{form.formState.errors.products.root.message}</p>
            )}
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Input
                      {...form.register(`products.${index}.n`)}
                      placeholder="品名"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="w-36 space-y-1">
                    <Input
                      {...form.register(`products.${index}.s`)}
                      placeholder="SKU/條碼"
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                  <div className="w-16">
                    <Input
                      {...form.register(`products.${index}.q`)}
                      type="number"
                      min={1}
                      placeholder="數量"
                      className="text-xs h-8 text-center"
                    />
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
