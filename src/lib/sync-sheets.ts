import { google } from 'googleapis'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!
const SHEET_NAME     = '設計需求歷史'

const PRIORITY_MAP: Record<string, string> = {
  urgent: '🔴 緊急', high: '🟠 高', normal: '🟡 一般', low: '⚪ 低',
}
const STATUS_MAP: Record<string, string> = {
  pending: '待處理', in_progress: '進行中', review: '審稿中',
  revision: '修改中', completed: '已完成', cancelled: '已取消',
}
const COLUMNS = [
  'id', '渠道', '活動期間', '活動名稱', '用途', '尺寸規格', '數量',
  '文案', '產品說明', '截止日', '優先級', '需求人', '設計師', '狀態',
  '建立時間', '更新時間', '備註',
]

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

const REMITTANCE_SHEET = '匯款管理'
const REMITTANCE_COLUMNS = [
  'id', '月份', '對象/內容', '合作對象', '金額', '受款戶名',
  '應付期', '付款日', '發票/單號', '已付款', '文件確認', '匯款資訊', '備註',
  '建立時間', '更新時間',
]

export async function syncRemittancesToSheets(): Promise<void> {
  if (!SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase
    .from('remittances')
    .select('*')
    .order('month', { ascending: false })
    .order('id', { ascending: true })

  if (error || !data) return

  const rows = data.map(r => [
    r.id,
    r.month ?? '',
    r.content ?? '',
    r.collab_name ?? '',
    r.amount ?? '',
    r.account_name ?? '',
    r.due_date ?? '',
    r.paid_date ?? '',
    r.invoice ?? '',
    r.is_paid ? '是' : '否',
    r.confirmed ? '是' : '否',
    r.bank_info ?? '',
    r.notes ?? '',
    r.created_at ? new Date(r.created_at).toLocaleString('zh-TW') : '',
    r.updated_at ? new Date(r.updated_at).toLocaleString('zh-TW') : '',
  ])

  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  const meta   = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const exists = meta.data.sheets?.some(s => s.properties?.title === REMITTANCE_SHEET)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: REMITTANCE_SHEET } } }] },
    })
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `${REMITTANCE_SHEET}!A:Z` })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REMITTANCE_SHEET}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [REMITTANCE_COLUMNS, ...rows] },
  })
}

export async function syncDesignRequestsToSheets(): Promise<void> {
  if (!SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: requests, error } = await supabase
    .from('design_requests')
    .select(`
      *,
      channel:channels(name),
      requester:profiles!design_requests_requester_id_fkey(name),
      designer:profiles!design_requests_designer_id_fkey(name)
    `)
    .order('created_at', { ascending: true })

  if (error || !requests) return

  const rows = requests.map(r => {
    const req = r as Record<string, unknown>
    const channel  = req.channel  as { name?: string } | null
    const requester = req.requester as { name?: string } | null
    const designer  = req.designer  as { name?: string } | null
    return [
      req.id,
      channel?.name ?? '',
      req.activity_period ?? '',
      req.activity_name ?? '',
      req.purpose ?? '',
      req.size_spec ?? '',
      req.quantity ?? 1,
      req.copywriting ?? '',
      req.product_info ?? '',
      req.deadline ?? '',
      PRIORITY_MAP[req.priority as string] ?? req.priority ?? '',
      requester?.name ?? (req.requester_name as string) ?? '',
      designer?.name  ?? (req.designer_name  as string) ?? '',
      STATUS_MAP[req.status as string] ?? req.status ?? '',
      req.created_at ? new Date(req.created_at as string).toLocaleString('zh-TW') : '',
      req.updated_at ? new Date(req.updated_at as string).toLocaleString('zh-TW') : '',
      req.notes ?? '',
    ]
  })

  const sheets = google.sheets({ version: 'v4', auth: getAuth() })

  // Ensure sheet exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const exists = meta.data.sheets?.some(s => s.properties?.title === SHEET_NAME)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
    })
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:Z`,
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [COLUMNS, ...rows] },
  })
}
