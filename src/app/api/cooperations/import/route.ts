import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createClient } from '@/lib/supabase/server'

function normalizePlatform(raw: string | null): string | null {
  if (!raw) return null
  return raw
    .split(/[,/、]+/)
    .map(p => {
      const t = p.trim()
      if (/^ig$/i.test(t) || /instagram/i.test(t)) return 'IG'
      if (/^fb$/i.test(t) || /facebook/i.test(t) || /粉絲團/.test(t) || /粉專/.test(t)) return 'FB'
      if (/fb社團/.test(t) || /社團/.test(t)) return 'FB社團'
      if (/line/i.test(t) && /社群/.test(t)) return 'LINE社群'
      if (/私家line/i.test(t) || /私密/.test(t)) return '私家LINE'
      if (/^line$/i.test(t)) return 'LINE'
      if (/threads/i.test(t)) return 'Threads'
      if (/tiktok/i.test(t) || /抖音/.test(t)) return 'TikTok'
      if (/youtube/i.test(t) || /yt/i.test(t)) return 'YouTube'
      if (/blog/i.test(t) || /部落格/.test(t)) return 'Blog'
      return t
    })
    .filter(Boolean)
    .join(', ')
}

function normalizeOwner(raw: string | null): string | null {
  if (!raw) return null
  const map: Record<string, string> = { peggy: 'Peggy', PEGGY: 'Peggy', tilly: 'Tilly', TILLY: 'Tilly', cara: 'Cara', CARA: 'Cara' }
  return map[raw] ?? raw
}

function toInt(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''))
  return isFinite(n) ? Math.round(n) : null
}

function toFloat(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''))
  return isFinite(n) ? n : null
}

// POST /api/cooperations/import — accepts { rows: [...] } from V6_final_sorted.json format
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const rows: Record<string, unknown>[] = body.rows ?? []

  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: 'rows 必填' }, { status: 400 })

  const records = rows
    .filter(r => r['創作者'] && String(r['創作者']).trim())
    .map(r => ({
      data_source:             r['資料來源'] ?? null,
      is_paid:                 r['已匯款'] ?? '否',
      cooperation_type:        r['合作型式'] ?? null,
      tier:                    r['等級'] ?? null,
      year:                    r['年度'] ?? null,
      start_date:              /^\d{4}-\d{2}-\d{2}$/.test(String(r['開始日期'] ?? '')) ? r['開始日期'] : null,
      end_date:                /^\d{4}-\d{2}-\d{2}$/.test(String(r['結束日期'] ?? '')) ? r['結束日期'] : null,
      raw_date_text:           r['合作日期原始'] ?? null,
      creator_name:            String(r['創作者']).trim(),
      platform:                normalizePlatform(r['社群平台'] as string | null),
      social_url:              r['連結'] ?? null,
      product:                 r['合作產品'] ?? null,
      group_buy_system:        r['開團系統'] ?? null,
      content_format:          r['素材形式'] ?? null,
      owner:                   normalizeOwner(r['接洽負責人'] as string | null),
      status:                  r['合作狀態'] ?? null,
      discount:                r['團購折數'] ?? null,
      commission_rate:         toFloat(r['分潤比例']),
      fee_excl_tax:            toInt(r['合作費用未稅']),
      fee_incl_tax:            toInt(r['合作費用含稅']),
      order_count:             toInt(r['訂單數量']),
      revenue_excl_tax:        toInt(r['營收未稅']),
      commission_excl_tax:     toInt(r['分潤金額未稅']),
      aov:                     toInt(r['客單價']),
      ad_authorization:        r['廣告主授權'] ?? null,
      quote_note:              r['報價備註'] ?? null,
      shipping_info:           r['收件資訊'] ?? null,
      bank_info:               r['匯款資訊'] ?? null,
      paid_amount:             toInt(r['匯款金額']),
      paid_date:               /^\d{4}-\d{2}-\d{2}$/.test(String(r['付款日'] ?? '')) ? r['付款日'] : null,
      labor_report_no:         r['勞報號'] ?? null,
      paid_match_note:         r['匯款資料備註'] ?? null,
      is_potential_duplicate:  r['可能重複'] != null && r['可能重複'] !== '' && r['可能重複'] !== false,
    }))

  const supabase = await createClient()
  let inserted = 0
  const errors: string[] = []

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100)
    const { error } = await supabase.from('cooperations').insert(batch)
    if (error) errors.push(`Batch ${i}–${i + batch.length}: ${error.message}`)
    else inserted += batch.length
  }

  return NextResponse.json({ inserted, errors }, { status: errors.length > 0 ? 207 : 201 })
}
