'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createRequest } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { CHANNEL_ICONS } from '@/lib/constants'
import type { Channel } from '@/lib/types'
import { ChevronLeft, ChevronRight, Check, Plus, Trash2, Loader2 } from 'lucide-react'

const schema = z.object({
  channel_id:      z.number({ required_error: '請選擇渠道' }).min(1),
  activity_period: z.string().optional(),
  activity_name:   z.string().min(2, '請填寫活動名稱（至少2字）'),
  purpose:         z.string().min(2, '請填寫用途'),
  size_spec:       z.string().optional(),
  quantity:        z.number().min(1).default(1),
  copywriting:     z.string().optional(),
  product_info:    z.string().optional(),
  reference_urls:  z.array(z.string().url('請輸入正確的網址格式').or(z.literal(''))).optional(),
  deadline:        z.string().optional(),
  priority:        z.enum(['urgent','high','normal','low']).default('normal'),
  notes:           z.string().optional(),
})

type FormData = z.infer<typeof schema>

const STEPS = ['選擇渠道', '活動資訊', '文案與內容', '截止與優先', '確認送出']

interface Props {
  channels: Channel[]
  requesterId: string
  onSuccess?: () => void
}

export function NewRequestForm({ channels, requesterId, onSuccess }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [referenceUrls, setReferenceUrls] = useState<string[]>([''])

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, priority: 'normal', reference_urls: [''] },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form
  const watchedChannelId = watch('channel_id')
  const selectedChannel = channels.find(c => c.id === watchedChannelId)

  const canProceed = () => {
    if (step === 0) return !!watchedChannelId
    if (step === 1) return !!watch('activity_name') && !!watch('purpose')
    return true
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    const cleanUrls = referenceUrls.filter(u => u.trim())
    const result = await createRequest({
      ...data,
      reference_urls: cleanUrls.length ? cleanUrls : undefined,
      deadline: data.deadline || undefined,
      size_spec: data.size_spec || undefined,
    })

    if (result.error) {
      toast.error(result.error)
      setSubmitting(false)
      return
    }
    toast.success('設計需求已成功提交！')
    if (onSuccess) {
      onSuccess()
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="space-y-6">
      {/* 步驟指示器 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>步驟 {step + 1} / {STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className={cn(
              'flex-1 h-1 rounded-full transition-colors',
              i <= step ? 'bg-brand-600' : 'bg-gray-200'
            )} />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">

            {/* Step 0：選擇渠道 */}
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">選擇渠道</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {channels.map(ch => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setValue('channel_id', ch.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium',
                        watchedChannelId === ch.id
                          ? 'border-brand-600 bg-brand-50 text-brand-800'
                          : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
                      )}
                    >
                      <span className="text-2xl">{CHANNEL_ICONS[ch.slug] ?? '📁'}</span>
                      <span className="text-center leading-tight">{ch.name}</span>
                    </button>
                  ))}
                </div>
                {errors.channel_id && <p className="text-xs text-destructive">{errors.channel_id.message}</p>}
              </div>
            )}

            {/* Step 1：活動資訊 */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">活動資訊</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>活動期間</Label>
                    <Input placeholder="例：3/6-3/8" {...register('activity_period')} />
                  </div>
                  <div className="space-y-2">
                    <Label>活動名稱 *</Label>
                    <Input placeholder="例：38女王節-全館85折" {...register('activity_name')} />
                    {errors.activity_name && <p className="text-xs text-destructive">{errors.activity_name.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>用途 *</Label>
                  {selectedChannel?.default_sizes?.length ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {selectedChannel.default_sizes.map(ds => (
                          <button
                            key={ds.name}
                            type="button"
                            onClick={() => {
                              setValue('purpose', ds.name)
                              setValue('size_spec', ds.size)
                            }}
                            className={cn(
                              'px-3 py-1.5 text-xs rounded-full border transition-colors',
                              watch('purpose') === ds.name
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'border-gray-200 hover:border-brand-400'
                            )}
                          >
                            {ds.name} <span className="text-[10px] opacity-70">{ds.size}</span>
                          </button>
                        ))}
                      </div>
                      <Input placeholder="或手動輸入用途" {...register('purpose')} />
                    </div>
                  ) : (
                    <Input placeholder="例：首頁BN、FB貼文、IG限動" {...register('purpose')} />
                  )}
                  {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>尺寸規格</Label>
                    <Input placeholder="例：1080x1080" {...register('size_spec')} />
                  </div>
                  <div className="space-y-2">
                    <Label>數量</Label>
                    <Input type="number" min={1} {...register('quantity', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2：文案與內容 */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">文案與需求內容</h3>
                <div className="space-y-2">
                  <Label>文案內容</Label>
                  <Textarea
                    placeholder="請貼上完整文案，包含標題、副標、CTA…"
                    className="min-h-[100px]"
                    {...register('copywriting')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>需求內容（產品說明）</Label>
                  <Textarea
                    placeholder="說明產品特點、需要強調的訴求、目標受眾…"
                    className="min-h-[80px]"
                    {...register('product_info')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>參考連結</Label>
                  {referenceUrls.map((url, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={url}
                        onChange={e => {
                          const next = [...referenceUrls]
                          next[idx] = e.target.value
                          setReferenceUrls(next)
                        }}
                        placeholder="https://..."
                        type="url"
                      />
                      {referenceUrls.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setReferenceUrls(referenceUrls.filter((_,i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReferenceUrls([...referenceUrls, ''])}
                    className="mt-1"
                  >
                    <Plus className="h-3.5 w-3.5" />新增連結
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3：截止日與優先級 */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">交件日與優先級</h3>
                <div className="space-y-2">
                  <Label>最晚交件日</Label>
                  <Input type="date" {...register('deadline')} />
                </div>
                <div className="space-y-2">
                  <Label>優先級</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { v: 'urgent', label: '🔴 緊急', desc: '今日或明日需要' },
                      { v: 'high',   label: '🟠 高',   desc: '3天內需要' },
                      { v: 'normal', label: '🟡 一般', desc: '一週內' },
                      { v: 'low',    label: '⚪ 低',   desc: '彈性時間' },
                    ] as const).map(({ v, label, desc }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValue('priority', v)}
                        className={cn(
                          'flex flex-col gap-1 p-3 rounded-lg border-2 text-left transition-all',
                          watch('priority') === v
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <span className="font-medium text-sm">{label}</span>
                        <span className="text-xs text-muted-foreground">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>備註</Label>
                  <Textarea placeholder="其他補充說明…" {...register('notes')} />
                </div>
              </div>
            )}

            {/* Step 4：預覽確認 */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">確認需求內容</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                  {[
                    ['渠道', selectedChannel?.name],
                    ['活動期間', watch('activity_period')],
                    ['活動名稱', watch('activity_name')],
                    ['用途', watch('purpose')],
                    ['尺寸規格', watch('size_spec')],
                    ['數量', watch('quantity')],
                    ['截止日', watch('deadline')],
                    ['優先級', { urgent:'🔴 緊急', high:'🟠 高', normal:'🟡 一般', low:'⚪ 低' }[watch('priority')]],
                  ].map(([k, v]) => v ? (
                    <div key={String(k)} className="flex gap-3">
                      <span className="text-muted-foreground w-20 shrink-0">{k}</span>
                      <span className="font-medium">{String(v)}</span>
                    </div>
                  ) : null)}
                  {watch('copywriting') && (
                    <div className="flex gap-3">
                      <span className="text-muted-foreground w-20 shrink-0">文案</span>
                      <span className="font-medium whitespace-pre-wrap">{watch('copywriting')}</span>
                    </div>
                  )}
                  {watch('product_info') && (
                    <div className="flex gap-3">
                      <span className="text-muted-foreground w-20 shrink-0">產品說明</span>
                      <span className="font-medium whitespace-pre-wrap">{watch('product_info')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 按鈕列 */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
          >
            <ChevronLeft className="h-4 w-4" />{step === 0 ? '取消' : '上一步'}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="bg-brand-800 hover:bg-brand-900 text-white"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              下一步<ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="bg-brand-800 hover:bg-brand-900 text-white"
              disabled={submitting}
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" />提交中…</>
                : <><Check className="h-4 w-4" />確認送出</>
              }
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
