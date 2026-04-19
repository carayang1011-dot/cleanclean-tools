'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Upload, Loader2, Users, Layers, FileSpreadsheet } from 'lucide-react'
import type { Profile, Channel } from '@/lib/types'
import { updateUserRole, importExcelData } from '@/lib/actions'

interface Props {
  profiles: Profile[]
  channels: Channel[]
  currentUserId: string
}

export function AdminPanel({ profiles: initialProfiles, channels, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [profiles, setProfiles] = useState(initialProfiles)
  const [importing, setImporting] = useState(false)
  const [importLog, setImportLog] = useState<string[]>([])

  // 角色更新（透過 Server Action，內含管理員權限驗證）
  const updateRole = async (userId: string, role: string) => {
    const result = await updateUserRole(userId, role)
    if (result.error) { toast.error(result.error); return }
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: role as Profile['role'] } : p))
    toast.success('角色已更新')
  }

  // ── Excel 匯入（解析在 client，寫入透過 Server Action 驗證權限）──
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportLog([])

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const logs: string[] = []

      // 先取得渠道 slug->id 映射（唯讀，安全）
      const { data: channelRows } = await supabase.from('channels').select('id, name, slug')
      const channelMap: Record<string, number> = {}
      channelRows?.forEach(c => {
        channelMap[c.name] = c.id
        channelMap[c.slug] = c.id
      })

      const allRows: Array<{
        channel_id: number | null
        activity_period: string | null
        activity_name: string
        purpose: string
        size_spec: string | null
        quantity: number
        copywriting: string | null
        product_info: string | null
        deadline: string | null
        notes: string | null
        status: string
      }> = []

      for (const sheetName of wb.SheetNames) {
        logs.push(`📄 處理 Sheet：${sheetName}`)
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { header: 1, defval: '' })
        if (rows.length < 2) { logs.push(`  ⚠️ 無資料，略過`); continue }

        const dataRows = rows.slice(1)
        const sheetData = dataRows
          .filter(row => row[1])
          .map(row => {
            const statusMap: Record<string, string> = {
              '已完成': 'completed', '完成': 'completed',
              '進行中': 'in_progress', '進行': 'in_progress',
              '審核中': 'review', '修改': 'revision',
              '待處理': 'pending', '': 'pending',
            }
            const rawStatus = String(row[9] ?? '').trim()
            const status = statusMap[rawStatus] ?? 'completed'

            const rawDeadline = row[7] ? String(row[7]).trim() : null
            let deadline: string | null = null
            if (rawDeadline) {
              try {
                const d = new Date(rawDeadline)
                if (!isNaN(d.getTime())) deadline = d.toISOString().slice(0, 10)
              } catch {}
            }

            return {
              channel_id: channelMap[sheetName] ?? null,
              activity_period: String(row[0] ?? '').trim() || null,
              activity_name: String(row[1] ?? '').trim(),
              purpose: String(row[2] ?? '').trim() || '其他',
              size_spec: String(row[3] ?? '').trim() || null,
              quantity: Number(row[4]) || 1,
              copywriting: String(row[5] ?? '').trim() || null,
              product_info: String(row[6] ?? '').trim() || null,
              deadline,
              notes: String(row[8] ?? '').trim() || null,
              status,
            }
          })

        if (sheetData.length === 0) { logs.push(`  ⚠️ 無有效資料列`); continue }
        allRows.push(...sheetData)
        logs.push(`  📝 ${sheetData.length} 筆資料準備匯入`)
      }

      if (allRows.length === 0) {
        logs.push(`\n⚠️ 無資料可匯入`)
        setImportLog(logs)
        return
      }

      // 透過 Server Action 匯入（含管理員權限驗證 + 內容消毒）
      const result = await importExcelData(allRows)
      if (result.error) {
        toast.error(result.error)
        logs.push(`❌ ${result.error}`)
      } else {
        if (result.logs) logs.push(...result.logs)
        logs.push(`\n🎉 完成！共匯入 ${result.totalInserted} 筆資料`)
        toast.success(`Excel 匯入完成，共 ${result.totalInserted} 筆`)
      }

      setImportLog(logs)
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知錯誤'
      toast.error('匯入失敗：' + msg)
      setImportLog([`❌ 錯誤：${msg}`])
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const roleLabel: Record<string, string> = { requester: '需求方', designer: '設計師', admin: '管理員' }
  const roleBadgeColor: Record<string, string> = {
    requester: 'bg-blue-100 text-blue-700',
    designer:  'bg-green-100 text-green-700',
    admin:     'bg-purple-100 text-purple-700',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-900">系統管理</h2>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" />使用者管理</TabsTrigger>
          <TabsTrigger value="channels"><Layers className="h-4 w-4 mr-1.5" />渠道管理</TabsTrigger>
          <TabsTrigger value="import"><FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel 匯入</TabsTrigger>
        </TabsList>

        {/* 使用者管理 */}
        <TabsContent value="users" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">使用者清單（{profiles.length} 人）</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profiles.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-800">
                      {p.name.slice(0,2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
                    <select
                      value={p.role}
                      onChange={e => updateRole(p.id, e.target.value)}
                      disabled={p.id === currentUserId}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${roleBadgeColor[p.role]}`}
                    >
                      <option value="requester">需求方</option>
                      <option value="designer">設計師</option>
                      <option value="admin">管理員</option>
                    </select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 渠道管理 */}
        <TabsContent value="channels" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">渠道清單（{channels.length} 個）</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {channels.map(ch => (
                  <div key={ch.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{ch.name}</p>
                        <Badge variant="outline" className="text-xs">{ch.slug}</Badge>
                      </div>
                      {ch.default_sizes?.length ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ch.default_sizes.map(s => (
                            <span key={s.name} className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-muted-foreground">
                              {s.name} {s.size}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Excel 匯入 */}
        <TabsContent value="import" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">匯入歷史資料（Excel）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 text-sm space-y-2">
                <p className="font-semibold text-brand-800">Excel 格式說明</p>
                <p className="text-brand-700">每個 Sheet = 一個渠道（Sheet 名稱需與渠道名稱相符）</p>
                <p className="text-muted-foreground">欄位順序：活動期間 ／ 活動內容 ／ 用途 ／ 尺寸 ／ 數量 ／ 文案 ／ 需求內容(產品) ／ 最晚交件日 ／ 備註(負責人) ／ 進度 ／ 發需求的人</p>
                <p className="text-xs text-muted-foreground">進度欄：已完成、進行中、審核中、修改、待處理</p>
              </div>

              <label className={`inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg bg-brand-800 text-white text-sm font-medium hover:bg-brand-900 transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? '匯入中…' : '選擇 Excel 檔案'}
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleExcelImport} />
              </label>

              {importLog.length > 0 && (
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs max-h-64 overflow-y-auto">
                  {importLog.map((line, i) => (
                    <div key={i} className={line.includes('❌') ? 'text-red-400' : line.includes('✅') ? 'text-green-400' : line.includes('🎉') ? 'text-yellow-400' : 'text-gray-300'}>
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
