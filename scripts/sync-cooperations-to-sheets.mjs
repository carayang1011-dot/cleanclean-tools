/**
 * 將 cooperations 資料同步到 Google Sheets「合作排程」工作表
 * 執行：node scripts/sync-cooperations-to-sheets.mjs
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SPREADSHEET_ID  = process.env.GOOGLE_SPREADSHEET_ID
const SHEET_NAME      = '合作排程'

const COLUMNS = [
  'ID', '合作型式', '合作狀態', '開始日期', '結束日期',
  '創作者', '社群平台', '社群連結', '等級',
  '合作產品', '素材形式', '開團系統',
  '接洽負責人',
  '團購折數', '分潤比例', '訂單數量', '營收未稅', '分潤金額未稅', '客單價',
  '費用未稅', '費用含稅',
  '廣告主授權', '報價備註',
  '已匯款', '匯款金額', '付款日', '勞報號', '對帳備註',
  '收件資訊', '匯款資訊',
  '資料來源', '可能重複', '建立時間', '更新時間',
]

function pct(n) {
  if (n == null) return ''
  return `${Math.round(n * 100)}%`
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data: rows, error } = await supabase
    .from('cooperations')
    .select('*')
    .order('start_date', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw new Error(`Supabase error: ${error.message}`)
  console.log(`取得 ${rows.length} 筆合作紀錄`)

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const existing = meta.data.sheets.find(s => s.properties.title === SHEET_NAME)
  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
    })
    console.log(`工作表「${SHEET_NAME}」已建立`)
  }

  const data = rows.map(r => [
    r.id,
    r.cooperation_type ?? '',
    r.status ?? '',
    r.start_date ?? '',
    r.end_date ?? '',
    r.creator_name ?? '',
    r.platform ?? '',
    r.social_url ?? '',
    r.tier ?? '',
    r.product ?? '',
    r.content_format ?? '',
    r.group_buy_system ?? '',
    r.owner ?? '',
    r.discount ?? '',
    pct(r.commission_rate),
    r.order_count ?? '',
    r.revenue_excl_tax ?? '',
    r.commission_excl_tax ?? '',
    r.aov ?? '',
    r.fee_excl_tax ?? '',
    r.fee_incl_tax ?? '',
    r.ad_authorization ?? '',
    r.quote_note ?? '',
    r.is_paid ?? '否',
    r.paid_amount ?? '',
    r.paid_date ?? '',
    r.labor_report_no ?? '',
    r.paid_match_note ?? '',
    r.shipping_info ?? '',
    r.bank_info ?? '',
    r.data_source ?? '',
    r.is_potential_duplicate ? '是' : '',
    r.created_at ? new Date(r.created_at).toLocaleString('zh-TW') : '',
    r.updated_at ? new Date(r.updated_at).toLocaleString('zh-TW') : '',
  ])

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:AH`,
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [COLUMNS, ...data] },
  })

  console.log(`✅ 已同步 ${data.length} 筆到「${SHEET_NAME}」`)
  console.log(`   試算表：https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
