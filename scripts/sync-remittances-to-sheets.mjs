// 一次性同步所有匯款資料到 Google Sheets
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../.env.local') })

const SPREADSHEET_ID   = process.env.GOOGLE_SPREADSHEET_ID
const SHEET_NAME       = '匯款管理'
const COLUMNS = [
  'id', '月份', '對象/內容', '合作對象', '金額', '受款戶名',
  '應付期', '付款日', '發票/單號', '已付款', '文件確認', '匯款資訊', '備註',
  '建立時間', '更新時間',
]

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })

async function main() {
  console.log('讀取 Supabase remittances...')
  const { data, error } = await supabase
    .from('remittances')
    .select('*')
    .order('month', { ascending: false })
    .order('id', { ascending: true })

  if (error) { console.error('讀取失敗:', error.message); process.exit(1) }
  console.log(`共 ${data.length} 筆`)

  const rows = data.map(r => [
    r.id, r.month ?? '', r.content ?? '', r.collab_name ?? '',
    r.amount ?? '', r.account_name ?? '', r.due_date ?? '', r.paid_date ?? '',
    r.invoice ?? '', r.is_paid ? '是' : '否', r.confirmed ? '是' : '否',
    r.bank_info ?? '', r.notes ?? '',
    r.created_at ? new Date(r.created_at).toLocaleString('zh-TW') : '',
    r.updated_at ? new Date(r.updated_at).toLocaleString('zh-TW') : '',
  ])

  // 確保 sheet 存在
  const meta   = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const exists = meta.data.sheets?.some(s => s.properties?.title === SHEET_NAME)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
    })
    console.log(`已建立 sheet「${SHEET_NAME}」`)
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A:Z` })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [COLUMNS, ...rows] },
  })

  console.log(`✅ 已同步 ${rows.length} 筆到 Google Sheets「${SHEET_NAME}」分頁`)
}

main().catch(e => { console.error(e); process.exit(1) })
