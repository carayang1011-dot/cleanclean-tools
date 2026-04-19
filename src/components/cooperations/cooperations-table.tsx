'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search, ExternalLink, CheckCircle, Circle, AlertTriangle, Plus,
  Pencil, Trash2, Copy, Loader2, RefreshCw, Eye, EyeOff, Sheet,
} from 'lucide-react'
import type { Cooperation } from '@/lib/types'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['邀約中', '確認可合作', '表單未建置', '表單已建置', '產品已寄出', '結團中', '審文｜審片中', '廣告中', '進行中', '已完成', '暫不合作']
const ACTIVE_STATUSES = new Set(['邀約中', '確認可合作', '表單未建置', '表單已建置', '產品已寄出', '結團中', '審文｜審片中', '廣告中', '進行中'])
const OWNERS = ['阿芸', '媛媛', '默默', '跳跳', 'Cara', '戴戴', 'Peggy', 'Tilly', '阿葳', '媖媖', '黑黑']
const PRODUCTS = ['洗衣精', '除垢慕斯', '家事皂', '沐浴系列', '水凝乳', '潔顏系列', '洗碗精', '洗手乳', '廚房清潔', '浴室清潔', '地板清潔', '冷洗精', '護衣素', '衣物柔軟精']
const PLATFORMS = ['IG', 'FB', 'FB社團', 'LINE', 'LINE社群', '私家LINE', 'Threads', 'TikTok', 'YouTube', 'Blog']
const FORMATS = ['圖文', '限時動態', '短影音REELS', '中插影片', 'YouTube影片', 'Blog文章', '直播', 'Podcast']
const GROUP_BUY_SYSTEMS = ['團購表單', 'Shopline', 'AMA', '官網', '優惠代碼']
const DISCOUNTS = ['85折', '88折', '9折', '88折+首購200', '官網']
const YEARS = [2023, 2024, 2025, 2026]

const STATUS_COLOR: Record<string, string> = {
  '已完成':       'bg-emerald-100 text-emerald-800',
  '進行中':       'bg-blue-100 text-blue-800',
  '結團中':       'bg-violet-100 text-violet-800',
  '審文｜審片中': 'bg-violet-100 text-violet-800',
  '廣告中':       'bg-orange-100 text-orange-800',
  '表單已建置':   'bg-sky-100 text-sky-800',
  '產品已寄出':   'bg-cyan-100 text-cyan-800',
  '表單未建置':   'bg-amber-100 text-amber-800',
  '確認可合作':   'bg-amber-100 text-amber-800',
  '邀約中':       'bg-yellow-100 text-yellow-800',
  '暫不合作':     'bg-gray-100 text-gray-500',
}

function statusColor(s: string | null) {
  return STATUS_COLOR[s ?? ''] ?? 'bg-gray-100 text-gray-600'
}

function fmtCurrency(n: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('zh-TW')
}

function fmtPct(n: number | null) {
  if (n == null) return '—'
  return `${(n * 100).toFixed(0)}%`
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return s.slice(0, 10)
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const coopSchema = z.object({
  cooperation_type: z.string().default('團購分潤'),
  start_date: z.string().min(1, '請填寫開始日期'),
  end_date: z.string().optional().default(''),
  owner: z.string().optional().default(''),
  status: z.string().default('邀約中'),
  creator_name: z.string().min(1, '請填寫創作者名稱'),
  platform: z.string().optional().default(''),
  social_url: z.string().optional().default(''),
  tier: z.string().optional().default(''),
  product: z.string().optional().default(''),
  group_buy_system: z.string().optional().default(''),
  content_format: z.string().optional().default(''),
  // 純業配
  fee_excl_tax: z.coerce.number().optional().nullable(),
  fee_incl_tax: z.coerce.number().optional().nullable(),
  // 團購分潤
  discount: z.string().optional().default(''),
  commission_rate: z.coerce.number().optional().nullable(),
  order_count: z.coerce.number().optional().nullable(),
  revenue_excl_tax: z.coerce.number().optional().nullable(),
  commission_excl_tax: z.coerce.number().optional().nullable(),
  // 補充
  ad_authorization: z.string().optional().default(''),
  quote_note: z.string().optional().default(''),
  shipping_info: z.string().optional().default(''),
  bank_info: z.string().optional().default(''),
  is_paid: z.string().default('否'),
  year: z.coerce.number().optional().nullable(),
  // 匯款明細
  paid_amount: z.coerce.number().optional().nullable(),
  paid_date: z.string().optional().default(''),
  labor_report_no: z.string().optional().default(''),
  paid_match_note: z.string().optional().default(''),
  // 成效
  aov: z.coerce.number().optional().nullable(),
})
type CoopForm = z.infer<typeof coopSchema>

// ── Detail dialog ─────────────────────────────────────────────────────────────

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0 w-24">{label}</span>
      <span className="font-medium flex-1 break-words">{value}</span>
    </div>
  )
}

function CooperationDetail({
  item, onClose, onEdit,
}: { item: Cooperation; onClose: () => void; onEdit: (item: Cooperation) => void }) {
  const [showSensitive, setShowSensitive] = useState(false)
  const isPaid = item.is_paid === '是'
  const isGroupBuy = item.cooperation_type === '團購分潤'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2 flex-wrap">
            <span>{item.creator_name}</span>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor(item.status))}>
              {item.status ?? '未設定'}
            </span>
            {item.is_potential_duplicate && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />可能重複
              </span>
            )}
            <Button size="sm" variant="outline" className="ml-auto h-7 text-xs gap-1" onClick={() => onEdit(item)}>
              <Pencil className="h-3 w-3" />編輯
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <DetailSection title="基本資訊">
            <DetailRow label="合作型式" value={item.cooperation_type} />
            <DetailRow label="開始日期" value={fmtDate(item.start_date)} />
            <DetailRow label="結束日期" value={fmtDate(item.end_date)} />
            <DetailRow label="接洽負責人" value={item.owner} />
            <DetailRow label="等級" value={item.tier} />
            <DetailRow label="資料來源" value={item.data_source} />
          </DetailSection>

          <Separator />

          <DetailSection title="創作者資訊">
            <DetailRow label="社群平台" value={item.platform} />
            <DetailRow label="合作產品" value={item.product} />
            <DetailRow label="素材形式" value={item.content_format} />
            {item.social_url && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0 w-24">連結</span>
                <a href={item.social_url} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium">
                  開啟 <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </DetailSection>

          <Separator />

          <DetailSection title={isGroupBuy ? '團購條件' : '費用條件'}>
            {isGroupBuy ? (
              <>
                <DetailRow label="團購折數" value={item.discount} />
                <DetailRow label="分潤比例" value={fmtPct(item.commission_rate)} />
                <DetailRow label="開團系統" value={item.group_buy_system} />
                <DetailRow label="訂單數量" value={item.order_count?.toLocaleString()} />
                <DetailRow label="營收未稅" value={item.revenue_excl_tax ? `$${fmtCurrency(item.revenue_excl_tax)}` : null} />
                <DetailRow label="分潤金額" value={item.commission_excl_tax ? `$${fmtCurrency(item.commission_excl_tax)}` : null} />
                <DetailRow label="客單價" value={item.aov ? `$${fmtCurrency(item.aov)}` : null} />
              </>
            ) : (
              <>
                <DetailRow label="費用未稅" value={item.fee_excl_tax ? `$${fmtCurrency(item.fee_excl_tax)}` : null} />
                <DetailRow label="費用含稅" value={item.fee_incl_tax ? `$${fmtCurrency(item.fee_incl_tax)}` : null} />
              </>
            )}
          </DetailSection>

          <Separator />

          <DetailSection title="匯款資訊">
            <DetailRow label="已匯款" value={isPaid ? '✅ 是' : '⭕ 否'} />
            <DetailRow label="匯款金額" value={item.paid_amount ? `$${fmtCurrency(item.paid_amount)}` : null} />
            <DetailRow label="付款日" value={fmtDate(item.paid_date)} />
            <DetailRow label="勞報號" value={item.labor_report_no} />
            {item.paid_match_note && (
              <div className="mt-1">
                <p className="text-muted-foreground text-xs mb-1">對帳備註</p>
                <p className="bg-gray-50 rounded p-2 text-xs leading-relaxed">{item.paid_match_note}</p>
              </div>
            )}
          </DetailSection>

          {(item.ad_authorization || item.quote_note || item.shipping_info || item.bank_info) && (
            <>
              <Separator />
              <DetailSection title="補充資訊">
                {item.ad_authorization && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">廣告主授權</p>
                    <p className="bg-gray-50 rounded p-2 text-xs leading-relaxed whitespace-pre-wrap">{item.ad_authorization}</p>
                  </div>
                )}
                {item.quote_note && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">報價備註</p>
                    <p className="bg-gray-50 rounded p-2 text-xs leading-relaxed whitespace-pre-wrap">{item.quote_note}</p>
                  </div>
                )}
                {(item.shipping_info || item.bank_info) && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-muted-foreground text-xs">收件 / 匯款資訊</p>
                      <button
                        onClick={() => setShowSensitive(v => !v)}
                        className="text-xs text-blue-600 flex items-center gap-0.5 hover:underline"
                      >
                        {showSensitive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {showSensitive ? '隱藏' : '顯示'}
                      </button>
                    </div>
                    {showSensitive ? (
                      <>
                        {item.shipping_info && <p className="bg-gray-50 rounded p-2 text-xs leading-relaxed whitespace-pre-wrap mb-1">{item.shipping_info}</p>}
                        {item.bank_info && <p className="bg-gray-50 rounded p-2 text-xs leading-relaxed whitespace-pre-wrap">{item.bank_info}</p>}
                      </>
                    ) : (
                      <p className="bg-gray-50 rounded p-2 text-xs text-muted-foreground">（含個人資料，點顯示查看）</p>
                    )}
                  </div>
                )}
              </DetailSection>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Create/Edit form ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">{children}</p>
}

function FieldRow({ label, required, children, error }: { label: string; required?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function ChipSelect({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  const selected = value ? value.split(', ').filter(Boolean) : []

  function toggle(opt: string) {
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt]
    onChange(next.join(', '))
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
            selected.includes(opt)
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

interface FormDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingItem: Cooperation | null
  creatorSuggestions: string[]
  onSaved: () => void
}

function CooperationFormDialog({ open, onOpenChange, editingItem, creatorSuggestions, onSaved }: FormDialogProps) {
  const [saving, setSaving] = useState(false)

  const form = useForm<CoopForm>({
    resolver: zodResolver(coopSchema),
    defaultValues: { cooperation_type: '團購分潤', status: '邀約中', is_paid: '否' },
  })

  const coopType = form.watch('cooperation_type')
  const feeExcl = form.watch('fee_excl_tax')

  // Auto-calc fee_incl_tax
  useEffect(() => {
    if (coopType === '純業配' && feeExcl != null) {
      form.setValue('fee_incl_tax', Math.round(Number(feeExcl) * 1.1))
    }
  }, [feeExcl, coopType, form])

  useEffect(() => {
    if (!open) return
    if (editingItem) {
      form.reset({
        cooperation_type: editingItem.cooperation_type ?? '團購分潤',
        start_date: editingItem.start_date ?? '',
        end_date: editingItem.end_date ?? '',
        owner: editingItem.owner ?? '',
        status: editingItem.status ?? '邀約中',
        creator_name: editingItem.creator_name,
        platform: editingItem.platform ?? '',
        social_url: editingItem.social_url ?? '',
        tier: editingItem.tier ?? '',
        product: editingItem.product ?? '',
        group_buy_system: editingItem.group_buy_system ?? '',
        content_format: editingItem.content_format ?? '',
        fee_excl_tax: editingItem.fee_excl_tax ?? undefined,
        fee_incl_tax: editingItem.fee_incl_tax ?? undefined,
        discount: editingItem.discount ?? '',
        commission_rate: editingItem.commission_rate != null ? Math.round(editingItem.commission_rate * 100) : undefined,
        order_count: editingItem.order_count ?? undefined,
        revenue_excl_tax: editingItem.revenue_excl_tax ?? undefined,
        commission_excl_tax: editingItem.commission_excl_tax ?? undefined,
        ad_authorization: editingItem.ad_authorization ?? '',
        quote_note: editingItem.quote_note ?? '',
        shipping_info: editingItem.shipping_info ?? '',
        bank_info: editingItem.bank_info ?? '',
        is_paid: editingItem.is_paid ?? '否',
        year: editingItem.year ?? undefined,
        paid_amount: editingItem.paid_amount ?? undefined,
        paid_date: editingItem.paid_date ?? '',
        labor_report_no: editingItem.labor_report_no ?? '',
        paid_match_note: editingItem.paid_match_note ?? '',
        aov: editingItem.aov ?? undefined,
      })
    } else {
      const y = new Date().getFullYear()
      form.reset({ cooperation_type: '團購分潤', status: '邀約中', is_paid: '否', year: y })
    }
  }, [open, editingItem, form])

  async function onSubmit(values: CoopForm) {
    setSaving(true)
    try {
      const payload = {
        ...values,
        year: values.start_date ? parseInt(values.start_date.slice(0, 4)) : values.year,
        end_date: values.end_date || null,
        fee_excl_tax: values.fee_excl_tax ?? null,
        fee_incl_tax: values.fee_incl_tax ?? null,
        commission_rate: values.commission_rate != null ? values.commission_rate / 100 : null,
        order_count: values.order_count ?? null,
        revenue_excl_tax: values.revenue_excl_tax ?? null,
        commission_excl_tax: values.commission_excl_tax ?? null,
        aov: values.aov ?? null,
        paid_amount: values.paid_amount ?? null,
        paid_date: values.paid_date || null,
        labor_report_no: values.labor_report_no || null,
        paid_match_note: values.paid_match_note || null,
      }

      let res: Response
      if (editingItem) {
        res = await fetch(`/api/cooperations/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/cooperations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? '操作失敗')
      }

      toast.success(editingItem ? '已更新' : '已新增')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失敗')
    } finally {
      setSaving(false)
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? '編輯合作紀錄' : '新增合作紀錄'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-1">
          {/* Block A: 基本資訊 */}
          <SectionTitle>基本資訊</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldRow label="合作型式" required>
                <div className="flex gap-2">
                  {['團購分潤', '純業配'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => form.setValue('cooperation_type', t)}
                      className={cn(
                        'px-4 py-1.5 rounded-md text-sm font-medium border transition-colors',
                        coopType === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </FieldRow>
            </div>

            <FieldRow label="開始日期" required error={errors.start_date?.message}>
              <Input type="date" {...form.register('start_date')} />
            </FieldRow>
            <FieldRow label="結束日期">
              <Input type="date" {...form.register('end_date')} />
            </FieldRow>

            <FieldRow label="接洽負責人">
              <Select value={form.watch('owner')} onValueChange={v => form.setValue('owner', v)}>
                <SelectTrigger><SelectValue placeholder="選擇負責人" /></SelectTrigger>
                <SelectContent>
                  {OWNERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="合作狀態">
              <Select value={form.watch('status')} onValueChange={v => form.setValue('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow label="等級">
              <Input {...form.register('tier')} placeholder="S / A / B / C" />
            </FieldRow>
            <FieldRow label="已匯款">
              <Select value={form.watch('is_paid')} onValueChange={v => form.setValue('is_paid', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="否">否</SelectItem>
                  <SelectItem value="是">是</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          <Separator />

          {/* Block B: 創作者 */}
          <SectionTitle>創作者資訊</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldRow label="創作者名稱" required error={errors.creator_name?.message}>
                <Input
                  {...form.register('creator_name')}
                  list="creator-suggestions"
                  placeholder="輸入創作者名稱"
                />
                <datalist id="creator-suggestions">
                  {creatorSuggestions.map(c => <option key={c} value={c} />)}
                </datalist>
              </FieldRow>
            </div>

            <div className="col-span-2">
              <FieldRow label="社群平台">
                <ChipSelect
                  options={PLATFORMS}
                  value={form.watch('platform') ?? ''}
                  onChange={v => form.setValue('platform', v)}
                />
              </FieldRow>
            </div>

            <div className="col-span-2">
              <FieldRow label="社群連結">
                <Input {...form.register('social_url')} placeholder="https://www.instagram.com/..." />
              </FieldRow>
            </div>
          </div>

          <Separator />

          {/* Block C: 合作內容 */}
          <SectionTitle>合作內容</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldRow label="合作產品">
                <Input {...form.register('product')} placeholder="洗衣精、除垢慕斯…" list="product-list" />
                <datalist id="product-list">
                  {PRODUCTS.map(p => <option key={p} value={p} />)}
                </datalist>
              </FieldRow>
            </div>

            {coopType === '團購分潤' && (
              <FieldRow label="開團系統">
                <Select value={form.watch('group_buy_system') ?? ''} onValueChange={v => form.setValue('group_buy_system', v)}>
                  <SelectTrigger><SelectValue placeholder="選擇系統" /></SelectTrigger>
                  <SelectContent>
                    {GROUP_BUY_SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
            )}

            <div className="col-span-2">
              <FieldRow label="素材形式">
                <ChipSelect
                  options={FORMATS}
                  value={form.watch('content_format') ?? ''}
                  onChange={v => form.setValue('content_format', v)}
                />
              </FieldRow>
            </div>
          </div>

          <Separator />

          {/* Block D: 商務條件 */}
          <SectionTitle>商務條件</SectionTitle>
          {coopType === '純業配' ? (
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="合作費用（未稅）">
                <Input type="number" {...form.register('fee_excl_tax')} placeholder="30000" />
              </FieldRow>
              <FieldRow label="合作費用（含稅，自動）">
                <Input type="number" {...form.register('fee_incl_tax')} placeholder="33000" />
              </FieldRow>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="團購折數">
                <Input {...form.register('discount')} list="discount-list" placeholder="88折" />
                <datalist id="discount-list">
                  {DISCOUNTS.map(d => <option key={d} value={d} />)}
                </datalist>
              </FieldRow>
              <FieldRow label="分潤比例 (%)">
                <Input type="number" step="1" min="0" max="100" {...form.register('commission_rate')} placeholder="22" />
              </FieldRow>
              <FieldRow label="訂單數量">
                <Input type="number" {...form.register('order_count')} placeholder="421" />
              </FieldRow>
              <FieldRow label="營收未稅">
                <Input type="number" {...form.register('revenue_excl_tax')} placeholder="627089" />
              </FieldRow>
              <FieldRow label="客單價 (AOV)">
                <Input type="number" {...form.register('aov')} placeholder="1489" />
              </FieldRow>
              <div className="col-span-2">
                <FieldRow label="分潤金額未稅">
                  <Input type="number" {...form.register('commission_excl_tax')} placeholder="137960" />
                </FieldRow>
              </div>
            </div>
          )}

          <Separator />

          {/* Block E: 補充資訊 */}
          <SectionTitle>補充資訊</SectionTitle>
          <div className="space-y-3">
            <FieldRow label="廣告主授權">
              <Textarea {...form.register('ad_authorization')} rows={2} className="resize-none text-sm" placeholder="IG 廣告主授權，單月費用…" />
            </FieldRow>
            <FieldRow label="報價備註">
              <Textarea {...form.register('quote_note')} rows={3} className="resize-none text-sm" placeholder="報價流程、備註…" />
            </FieldRow>
            <FieldRow label="收件資訊（含個資）">
              <Textarea {...form.register('shipping_info')} rows={2} className="resize-none text-sm" placeholder="姓名 / 電話 / 地址" />
            </FieldRow>
            <FieldRow label="匯款資訊（含敏感資料）">
              <Textarea {...form.register('bank_info')} rows={2} className="resize-none text-sm" placeholder="戶名 / 銀行 / 帳號" />
            </FieldRow>
          </div>

          <Separator />

          {/* Block F: 匯款明細 */}
          <SectionTitle>匯款明細</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="匯款金額">
              <Input type="number" {...form.register('paid_amount')} placeholder="30000" />
            </FieldRow>
            <FieldRow label="付款日">
              <Input type="date" {...form.register('paid_date')} />
            </FieldRow>
            <FieldRow label="勞報號">
              <Input {...form.register('labor_report_no')} placeholder="110-XXX" />
            </FieldRow>
            <div className="col-span-2">
              <FieldRow label="對帳備註">
                <Textarea {...form.register('paid_match_note')} rows={2} className="resize-none text-sm" placeholder="備註說明…" />
              </FieldRow>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? '儲存變更' : '新增紀錄'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialData: Cooperation[]
}

export function CooperationsTable({ initialData }: Props) {
  const [data, setData] = useState(initialData)
  const [q, setQ] = useState('')
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<Cooperation | null>(null)
  const [editing, setEditing] = useState<Cooperation | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [sortCol, setSortCol] = useState<string>('start_date')
  const [sortAsc, setSortAsc] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const creatorSuggestions = useMemo(() =>
    [...new Set(data.map(d => d.creator_name))].sort(),
    [data]
  )

  const syncToSheets = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/cooperations/sync-sheets', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '同步失敗')
      toast.success(`已同步 ${json.synced} 筆到 Google Sheets`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '同步失敗')
    } finally {
      setSyncing(false)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/cooperations')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json.data ?? [])
    } catch {
      toast.error('重新載入失敗')
    } finally {
      setRefreshing(false)
    }
  }, [])

  const handleDelete = useCallback(async (item: Cooperation, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`確定刪除「${item.creator_name}」這筆紀錄？`)) return
    const res = await fetch(`/api/cooperations/${item.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('已刪除')
      setData(prev => prev.filter(d => d.id !== item.id))
      if (selected?.id === item.id) setSelected(null)
    } else {
      toast.error('刪除失敗')
    }
  }, [selected])

  const handleDuplicate = useCallback(async (item: Cooperation, e: React.MouseEvent) => {
    e.stopPropagation()
    const { id, created_at, updated_at, ...rest } = item as Cooperation & { created_at: string; updated_at: string }
    const payload = { ...rest, status: '邀約中', is_paid: '否', paid_amount: null, paid_date: null, labor_report_no: null, paid_match_note: null }
    const res = await fetch('/api/cooperations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      toast.success('已複製一筆，狀態重置為「邀約中」')
      await fetchData()
    } else {
      toast.error('複製失敗')
    }
  }, [fetchData])

  const handleBulkStatusChange = useCallback(async (status: string) => {
    if (bulkSelected.size === 0) return
    const ids = [...bulkSelected]
    const res = await fetch('/api/cooperations/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, patch: { status } }),
    })
    if (res.ok) {
      toast.success(`已更新 ${ids.length} 筆狀態為「${status}」`)
      setBulkSelected(new Set())
      await fetchData()
    } else {
      toast.error('批次更新失敗')
    }
  }, [bulkSelected, fetchData])

  const handleBulkMarkPaid = useCallback(async () => {
    if (bulkSelected.size === 0) return
    const ids = [...bulkSelected]
    const res = await fetch('/api/cooperations/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, patch: { is_paid: '是' } }),
    })
    if (res.ok) {
      toast.success(`已標記 ${ids.length} 筆為已匯款`)
      setBulkSelected(new Set())
      await fetchData()
    } else {
      toast.error('批次更新失敗')
    }
  }, [bulkSelected, fetchData])

  // Unique statuses from data
  const allStatuses = useMemo(() => {
    const s = new Set(data.map(d => d.status).filter(Boolean) as string[])
    return Array.from(s).sort()
  }, [data])

  const filtered = useMemo(() => {
    let rows = data
    if (yearFilter) rows = rows.filter(r => r.year === yearFilter)
    if (statusFilter) rows = rows.filter(r => r.status === statusFilter)
    if (ownerFilter) rows = rows.filter(r => r.owner === ownerFilter)
    if (typeFilter) rows = rows.filter(r => r.cooperation_type === typeFilter)
    if (q.trim()) {
      const lq = q.toLowerCase()
      rows = rows.filter(r =>
        r.creator_name.toLowerCase().includes(lq) ||
        (r.product ?? '').toLowerCase().includes(lq) ||
        (r.owner ?? '').toLowerCase().includes(lq) ||
        (r.platform ?? '').toLowerCase().includes(lq) ||
        (r.status ?? '').toLowerCase().includes(lq)
      )
    }
    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortCol]
      const bv = (b as unknown as Record<string, unknown>)[sortCol]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = String(av).localeCompare(String(bv), 'zh-TW', { numeric: true })
      return sortAsc ? cmp : -cmp
    })
  }, [data, q, yearFilter, statusFilter, ownerFilter, typeFilter, sortCol, sortAsc])

  const stats = useMemo(() => {
    const active    = data.filter(r => r.status && ACTIVE_STATUSES.has(r.status)).length
    const completed = data.filter(r => r.status === '已完成').length
    const paid      = data.filter(r => r.is_paid === '是').length
    const thisYear  = data.filter(r => r.year === new Date().getFullYear()).length
    return [
      { label: '全部', value: data.length,  color: 'text-slate-700' },
      { label: '進行中', value: active,     color: 'text-blue-700' },
      { label: '已完成', value: completed,  color: 'text-emerald-700' },
      { label: '已匯款', value: paid,       color: 'text-violet-700' },
      { label: String(new Date().getFullYear()) + ' 年', value: thisYear, color: 'text-amber-700' },
    ]
  }, [data])

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(v => !v)
    else { setSortCol(col); setSortAsc(false) }
  }

  function SortHeader({ col, children }: { col: string; children: React.ReactNode }) {
    const active = sortCol === col
    return (
      <th
        className={cn('px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors', active && 'text-foreground')}
        onClick={() => toggleSort(col)}
      >
        {children}{active ? (sortAsc ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(item: Cooperation) {
    setEditing(item)
    setFormOpen(true)
    setSelected(null)
  }

  function toggleBulk(id: number) {
    setBulkSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllBulk() {
    if (bulkSelected.size === filtered.length) {
      setBulkSelected(new Set())
    } else {
      setBulkSelected(new Set(filtered.map(r => r.id)))
    }
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜尋創作者、產品…"
              className="pl-8 h-8 text-sm w-48"
            />
          </div>

          <Select value={yearFilter?.toString() ?? '__all__'} onValueChange={v => setYearFilter(v === '__all__' ? null : parseInt(v))}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="全部年度" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部年度</SelectItem>
              {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y} 年</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={typeFilter ?? '__all__'} onValueChange={v => setTypeFilter(v === '__all__' ? null : v)}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="全部型式" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部型式</SelectItem>
              <SelectItem value="純業配">純業配</SelectItem>
              <SelectItem value="團購分潤">團購分潤</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter ?? '__all__'} onValueChange={v => setStatusFilter(v === '__all__' ? null : v)}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="全部狀態" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部狀態</SelectItem>
              {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={ownerFilter ?? '__all__'} onValueChange={v => setOwnerFilter(v === '__all__' ? null : v)}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="全部負責人" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部負責人</SelectItem>
              {OWNERS.filter(o => data.some(d => d.owner === o)).map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={fetchData} disabled={refreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            重新整理
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={syncToSheets} disabled={syncing}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sheet className="h-3.5 w-3.5" />}
            同步 Sheets
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />新增合作
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {bulkSelected.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 flex-wrap">
          <span className="text-sm font-medium text-blue-800">已選 {bulkSelected.size} 筆</span>
          <div className="flex gap-1.5">
            {['已完成', '邀約中', '暫不合作'].map(s => (
              <Button key={s} size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkStatusChange(s)}>
                改為「{s}」
              </Button>
            ))}
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleBulkMarkPaid}>
              標記已匯款
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setBulkSelected(new Set())}>
              取消選取
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">顯示 {filtered.length} / {data.length} 筆</p>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-auto shadow-sm">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2.5 w-8">
                <Checkbox
                  checked={filtered.length > 0 && bulkSelected.size === filtered.length}
                  onCheckedChange={toggleAllBulk}
                />
              </th>
              <SortHeader col="status">狀態</SortHeader>
              <SortHeader col="start_date">開始日期</SortHeader>
              <SortHeader col="creator_name">創作者</SortHeader>
              <SortHeader col="platform">平台</SortHeader>
              <SortHeader col="cooperation_type">合作型式</SortHeader>
              <SortHeader col="product">合作產品</SortHeader>
              <SortHeader col="owner">負責人</SortHeader>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">費用 / 分潤</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">已匯款</th>
              <th className="px-3 py-2.5 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-12 text-muted-foreground">
                  無符合條件的資料
                </td>
              </tr>
            )}
            {filtered.map(row => {
              const isGroupBuy = row.cooperation_type === '團購分潤'
              const moneyVal = isGroupBuy
                ? (row.commission_excl_tax != null ? `分潤 $${fmtCurrency(row.commission_excl_tax)}` : row.revenue_excl_tax != null ? `營收 $${fmtCurrency(row.revenue_excl_tax)}` : '—')
                : (row.fee_excl_tax != null ? `$${fmtCurrency(row.fee_excl_tax)}` : '—')

              return (
                <tr key={row.id}
                  className={cn(
                    'group hover:bg-gray-50 cursor-pointer transition-colors',
                    bulkSelected.has(row.id) && 'bg-blue-50 hover:bg-blue-50'
                  )}
                  onClick={() => setSelected(row)}>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={bulkSelected.has(row.id)}
                      onCheckedChange={() => toggleBulk(row.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', statusColor(row.status))}>
                      {row.status ?? '未設定'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap">{fmtDate(row.start_date)}</td>
                  <td className="px-3 py-2.5 font-medium">
                    <span className="flex items-center gap-1">
                      {row.creator_name}
                      {row.is_potential_duplicate && (
                        <span title="可能重複"><AlertTriangle className="h-3 w-3 text-red-400 shrink-0" /></span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">{row.platform ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {row.cooperation_type ?? '—'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-xs max-w-[120px] truncate">{row.product ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs">{row.owner ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs font-mono">{moneyVal}</td>
                  <td className="px-3 py-2.5">
                    {row.is_paid === '是'
                      ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                      : <Circle className="h-4 w-4 text-gray-300" />
                    }
                  </td>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="編輯" onClick={() => openEdit(row)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="複製" onClick={e => handleDuplicate(row, e)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" title="刪除" onClick={e => handleDelete(row, e)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail dialog */}
      {selected && (
        <CooperationDetail
          item={selected}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
        />
      )}

      {/* Create/Edit form dialog */}
      <CooperationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editing}
        creatorSuggestions={creatorSuggestions}
        onSaved={fetchData}
      />
    </div>
  )
}
