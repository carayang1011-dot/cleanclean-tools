/**
 * 將 design_requests 所有歷史資料同步到 Google Sheets
 * 執行：node scripts/sync-design-requests-to-sheets.mjs
 *
 * 需先確認 Google Sheet 已與 Service Account 共用（編輯者權限）：
 *   sheets-service@cleanclean-tools.iam.gserviceaccount.com
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID
const SHEET_NAME    = '設計需求歷史'

const COLUMNS = [
  'id', '渠道', '活動期間', '活動名稱', '用途', '尺寸規格', '數量',
  '文案', '產品說明', '截止日', '優先級',
  '需求人', '設計師', '狀態',
  '建立時間', '更新時間', '備註',
]

const PRIORITY_MAP = { urgent: '🔴 緊急', high: '🟠 高', normal: '🟡 一般', low: '⚪ 低' }
const STATUS_MAP   = {
  pending: '待處理', in_progress: '進行中', review: '審稿中',
  revision: '修改中', completed: '已完成', cancelled: '已取消',
}

async function main() {
  // ── Supabase ──────────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data: requests, error } = await supabase
    .from('design_requests')
    .select(`
      *,
      channel:channels(name),
      requester:profiles!design_requests_requester_id_fkey(name),
      designer:profiles!design_requests_designer_id_fkey(name)
    `)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Supabase error: ${error.message}`)
  console.log(`取得 ${requests.length} 筆設計需求`)

  // ── Google Sheets auth ────────────────────────────────────
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  // ── 確認工作表存在 ─────────────────────────────────────────
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const existing = meta.data.sheets.find(s => s.properties.title === SHEET_NAME)

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    })
    console.log(`工作表「${SHEET_NAME}」已建立`)
  }

  // ── 整理資料列 ─────────────────────────────────────────────
  const rows = requests.map(r => [
    r.id,
    r.channel?.name ?? r.channel_id ?? '',
    r.activity_period ?? '',
    r.activity_name ?? '',
    r.purpose ?? '',
    r.size_spec ?? '',
    r.quantity ?? 1,
    r.copywriting ?? '',
    r.product_info ?? '',
    r.deadline ?? '',
    PRIORITY_MAP[r.priority] ?? r.priority ?? '',
    r.requester?.name ?? r.requester_name ?? '',
    r.designer?.name  ?? r.designer_name  ?? '',
    STATUS_MAP[r.status] ?? r.status ?? '',
    r.created_at ? new Date(r.created_at).toLocaleString('zh-TW') : '',
    r.updated_at ? new Date(r.updated_at).toLocaleString('zh-TW') : '',
    r.notes ?? '',
  ])

  // ── 寫入（清空後重寫） ─────────────────────────────────────
  const range = `${SHEET_NAME}!A1`
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:Z`,
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [COLUMNS, ...rows] },
  })

  console.log(`✅ 已同步 ${rows.length} 筆資料到「${SHEET_NAME}」工作表`)
  console.log(`   試算表：https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
