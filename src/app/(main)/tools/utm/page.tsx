'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Copy, Plus, Trash2, Link2, Search, X, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface UtmForm {
  baseUrl: string
  source: string
  medium: string
  campaign: string
  term: string
  content: string
}

interface UtmRecord {
  id: string
  label: string
  baseUrl: string
  source: string
  medium: string
  campaign: string
  term: string
  content: string
  generatedUrl: string
  shortUrl: string
  category: string
  notes: string
  createdBy: string
  createdAt: string
}

const MEDIUM_OPTIONS = ['cpc', 'social', 'email', 'organic', 'referral', 'affiliate', 'display', 'video', 'line', 'post', 'ads']
const SOURCE_OPTIONS = ['instagram', 'facebook', 'youtube', 'google', 'line', 'tiktok', 'xiaohongshu', 'email-newsletter', 'shopee']

function buildUtmUrl(form: UtmForm): string {
  if (!form.baseUrl) return ''
  const url = new URL(form.baseUrl.startsWith('http') ? form.baseUrl : `https://${form.baseUrl}`)
  if (form.source) url.searchParams.set('utm_source', form.source)
  if (form.medium) url.searchParams.set('utm_medium', form.medium)
  if (form.campaign) url.searchParams.set('utm_campaign', form.campaign)
  if (form.term) url.searchParams.set('utm_term', form.term)
  if (form.content) url.searchParams.set('utm_content', form.content)
  return url.toString()
}

export default function UtmPage() {
  const [records, setRecords] = useState<UtmRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saveLabel, setSaveLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [mediumFilter, setMediumFilter] = useState('all')

  // Sort
  const [sortKey, setSortKey] = useState<keyof UtmRecord>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { register, watch, setValue, reset } = useForm<UtmForm>({
    defaultValues: { baseUrl: '', source: '', medium: '', campaign: '', term: '', content: '' },
  })

  const values = watch()
  const generatedUrl = (() => { try { return buildUtmUrl(values) } catch { return '' } })()

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/sheets/utm', { credentials: 'include' })
      const json = await res.json()
      setRecords(json.data ?? [])
    } catch {
      toast.error('載入 UTM 歷史失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const copyUrl = async () => {
    if (!generatedUrl) { toast.error('請先填寫網址'); return }
    await navigator.clipboard.writeText(generatedUrl)
    toast.success('已複製！')
  }

  const saveUrl = async () => {
    if (!generatedUrl) { toast.error('請先產生 URL'); return }
    setSaving(true)
    const label = saveLabel || values.campaign || `${values.source}_${values.medium}`.replace(/^_|_$/, '') || '未命名'
    try {
      const res = await fetch('/api/sheets/utm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, label, generatedUrl, shortUrl: '' }),
      })
      if (!res.ok) throw new Error()
      toast.success('已儲存到 UTM 歷史')
      setSaveLabel('')
      reset()
      fetchRecords()
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除？')) return
    try {
      const res = await fetch('/api/sheets/utm', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      toast.success('已刪除')
      setRecords(prev => prev.filter(r => r.id !== id))
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    } catch {
      toast.error('刪除失敗')
    }
  }

  const handleBulkDelete = async () => {
    if (!selected.size || !confirm(`確定要刪除 ${selected.size} 筆？`)) return
    let success = 0
    for (const id of selected) {
      try {
        await fetch('/api/sheets/utm', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        success++
      } catch { /* skip */ }
    }
    toast.success(`已刪除 ${success} 筆`)
    setSelected(new Set())
    fetchRecords()
  }

  // Derived filter options
  const categories = useMemo(() => ['all', ...Array.from(new Set(records.map(r => r.category).filter(Boolean)))], [records])
  const sources = useMemo(() => ['all', ...Array.from(new Set(records.map(r => r.source).filter(Boolean)))], [records])
  const mediums = useMemo(() => ['all', ...Array.from(new Set(records.map(r => r.medium).filter(Boolean)))], [records])

  const filtered = useMemo(() => {
    let list = records
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.label.toLowerCase().includes(q) ||
        r.campaign.toLowerCase().includes(q) ||
        r.generatedUrl.toLowerCase().includes(q) ||
        r.baseUrl.toLowerCase().includes(q)
      )
    }
    if (categoryFilter !== 'all') list = list.filter(r => r.category === categoryFilter)
    if (sourceFilter !== 'all') list = list.filter(r => r.source === sourceFilter)
    if (mediumFilter !== 'all') list = list.filter(r => r.medium === mediumFilter)
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [records, search, categoryFilter, sourceFilter, mediumFilter, sortKey, sortDir])

  const allIds = useMemo(() => filtered.map(r => r.id), [filtered])
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(allIds))
  }
  const toggleOne = (id: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const SortIcon = ({ col }: { col: keyof UtmRecord }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />
  }
  const toggleSort = (col: keyof UtmRecord) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">UTM 工具</h1>
        <p className="text-sm text-muted-foreground mt-0.5">產生帶有 UTM 追蹤參數的連結，並查閱歷史記錄</p>
      </div>

      <Tabs defaultValue="generator">
        <TabsList>
          <TabsTrigger value="generator">產生連結</TabsTrigger>
          <TabsTrigger value="history">歷史記錄 {!loading && <span className="ml-1.5 text-xs text-muted-foreground">({records.length})</span>}</TabsTrigger>
        </TabsList>

        {/* ── 產生連結 ── */}
        <TabsContent value="generator" className="mt-4">
          <Card className="shadow-none max-w-3xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">UTM 參數設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>目標網址 <span className="text-destructive">*</span></Label>
                <Input {...register('baseUrl')} placeholder="https://cleanclean.reyway.com/products/..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>utm_source（流量來源）</Label>
                  <div className="flex gap-2">
                    <Input {...register('source')} placeholder="instagram" className="flex-1" />
                    <Select onValueChange={v => setValue('source', v)}>
                      <SelectTrigger className="w-28"><SelectValue placeholder="常用" /></SelectTrigger>
                      <SelectContent>{SOURCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>utm_medium（媒介類型）</Label>
                  <div className="flex gap-2">
                    <Input {...register('medium')} placeholder="social" className="flex-1" />
                    <Select onValueChange={v => setValue('medium', v)}>
                      <SelectTrigger className="w-28"><SelectValue placeholder="常用" /></SelectTrigger>
                      <SelectContent>{MEDIUM_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>utm_campaign（活動名稱）</Label>
                  <Input {...register('campaign')} placeholder="2026_q2_laundry" />
                </div>

                <div className="space-y-1.5">
                  <Label>utm_content（內容識別）</Label>
                  <Input {...register('content')} placeholder="reel_A / banner_top" />
                </div>

                <div className="space-y-1.5">
                  <Label>utm_term（關鍵字）</Label>
                  <Input {...register('term')} placeholder="洗衣精 / cleanclean" />
                </div>
              </div>

              {generatedUrl && (
                <div className="space-y-1.5">
                  <Label>產生的連結</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs font-mono break-all text-muted-foreground">
                      {generatedUrl}
                    </div>
                    <Button variant="outline" size="icon" onClick={copyUrl} className="shrink-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={saveLabel}
                  onChange={e => setSaveLabel(e.target.value)}
                  placeholder="儲存標籤（選填，預設用活動名稱）"
                  className="flex-1"
                />
                <Button onClick={saveUrl} disabled={saving || !generatedUrl} className="gap-2 shrink-0 bg-brand-800 hover:bg-brand-900 text-white">
                  <Plus className="h-4 w-4" />
                  {saving ? '儲存中...' : '儲存到歷史'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 歷史記錄 ── */}
        <TabsContent value="history" className="mt-4 space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋連結、活動名稱..." className="pl-8" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="分類" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? '所有分類' : c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="來源" /></SelectTrigger>
              <SelectContent>
                {sources.map(s => <SelectItem key={s} value={s}>{s === 'all' ? '所有來源' : s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={mediumFilter} onValueChange={setMediumFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="媒介" /></SelectTrigger>
              <SelectContent>
                {mediums.map(m => <SelectItem key={m} value={m}>{m === 'all' ? '所有媒介' : m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <span className="text-blue-700 font-medium">已選 {selected.size} 筆</span>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-7 text-xs">
                <Trash2 className="h-3 w-3 mr-1" />刪除選取
              </Button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-blue-500 hover:text-blue-700 text-xs">取消選取</button>
            </div>
          )}

          {/* Table */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">載入中...</div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">無符合的記錄</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="w-10">
                          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                        </TableHead>
                        <TableHead className="cursor-pointer select-none min-w-32" onClick={() => toggleSort('label')}>
                          標籤 / 活動 <SortIcon col="label" />
                        </TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('category')}>
                          分類 <SortIcon col="category" />
                        </TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('source')}>
                          Source <SortIcon col="source" />
                        </TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('medium')}>
                          Medium <SortIcon col="medium" />
                        </TableHead>
                        <TableHead className="min-w-52">生成網址</TableHead>
                        <TableHead className="min-w-32">短網址</TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>
                          日期 <SortIcon col="createdAt" />
                        </TableHead>
                        <TableHead className="w-20 text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(row => (
                        <TableRow key={row.id} className={selected.has(row.id) ? 'bg-blue-50' : undefined}>
                          <TableCell>
                            <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleOne(row.id)} />
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium truncate max-w-48">{row.label || row.campaign || '—'}</p>
                            {row.campaign && row.label !== row.campaign && (
                              <p className="text-xs text-muted-foreground truncate max-w-48">{row.campaign}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.category && <Badge variant="outline" className="text-xs">{row.category}</Badge>}
                          </TableCell>
                          <TableCell className="text-sm">{row.source || '—'}</TableCell>
                          <TableCell className="text-sm">{row.medium || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 max-w-xs">
                              <span className="text-xs font-mono truncate text-muted-foreground flex-1">{row.generatedUrl}</span>
                              <button
                                onClick={async () => { await navigator.clipboard.writeText(row.generatedUrl); toast.success('已複製') }}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <a href={row.generatedUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.shortUrl ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono text-blue-600 truncate max-w-28">{row.shortUrl}</span>
                                <button
                                  onClick={async () => { await navigator.clipboard.writeText(row.shortUrl); toast.success('短網址已複製') }}
                                  className="shrink-0 text-muted-foreground hover:text-foreground"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <a href={row.shortUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {row.createdAt ? row.createdAt.split('T')[0] : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-red-50"
                              onClick={() => handleDelete(row.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground text-right">顯示 {filtered.length} / {records.length} 筆</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
