import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

const SHEET_NAME     = '合作排程'
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!

const COLUMNS = [
  'ID', '合作型式', '合作狀態', '開始日期', '結束日期',
  '創作者', '社群平台', '社群連結', '等級',
  '合作產品', '素材形式', '開團系統', '接洽負責人',
  '團購折數', '分潤比例', '訂單數量', '營收未稅', '分潤金額未稅', '客單價',
  '費用未稅', '費用含稅',
  '廣告主授權', '報價備註',
  '已匯款', '匯款金額', '付款日', '勞報號', '對帳備註',
  '收件資訊', '匯款資訊',
  '資料來源', '可能重複', '建立時間', '更新時間',
]

function pct(n: number | null): string {
  if (n == null) return ''
  return `${Math.round(n * 100)}%`
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = await createClient()
    const { data: rows, error } = await supabase
      .from('cooperations')
      .select('*')
      .order('start_date', { ascending: false })
      .order('id', { ascending: false })

    if (error) throw new Error(`Supabase: ${error.message}`)

    const sheetsAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const sheets = google.sheets({ version: 'v4', auth: sheetsAuth })

    // 確認工作表存在
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    const existing = meta.data.sheets?.find(s => s.properties?.title === SHEET_NAME)
    if (!existing) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
      })
    }

    const data = (rows ?? []).map(r => [
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

    return NextResponse.json({ synced: data.length })
  } catch (e) {
    const message = e instanceof Error ? e.message : '未知錯誤'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
