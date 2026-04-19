/**
 * Seed script: import 350 KOC/KOL cooperation records from V6_final_sorted.json
 * Usage: npm run seed:cooperations
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const envRaw = readFileSync(join(root, '.env.local'), 'utf8')
const env = {}
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY  = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!BASE || !KEY) { console.error('❌ 缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'); process.exit(1) }

const HDR = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }

async function rest(path, opts = {}) {
  const r = await fetch(`${BASE}/rest/v1${path}`, { headers: HDR, ...opts })
  const text = await r.text()
  return { status: r.status, ok: r.ok, body: text ? JSON.parse(text) : null }
}

// Platform normalization
function normalizePlatform(raw) {
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

// Owner normalization
function normalizeOwner(raw) {
  if (!raw) return null
  const map = { 'peggy': 'Peggy', 'PEGGY': 'Peggy', 'tilly': 'Tilly', 'TILLY': 'Tilly', 'cara': 'Cara', 'CARA': 'Cara' }
  return map[raw] ?? raw
}

// Parse number or null
function toInt(v) {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''))
  return isFinite(n) ? Math.round(n) : null
}

function toFloat(v) {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''))
  return isFinite(n) ? n : null
}

async function main() {
  console.log('🌱 開始 seed 合作紀錄\n')

  // 1. Check table exists
  const check = await rest('/cooperations?select=id&limit=1')
  if (!check.ok) {
    console.error('❌ cooperations 資料表不存在，請先在 Supabase Studio 執行 supabase/migrations/004_cooperations.sql')
    process.exit(1)
  }

  // 2. Clear existing records
  const countRes = await rest('/cooperations?select=id')
  const count = countRes.body?.length ?? 0
  if (count > 0) {
    console.log(`⚠️  清除 ${count} 筆現有資料...`)
    await rest('/cooperations?id=gt.0', { method: 'DELETE' })
    console.log('   清除完成')
  }

  // 3. Load JSON
  const srcPath = join(__dirname, '..', '..', '團購報表整理', 'V6_final_sorted.json')
  let srcData
  try {
    srcData = JSON.parse(readFileSync(srcPath, 'utf8'))
  } catch {
    // Try alternate path
    const alt = 'D:/claude_司/團購報表整理/V6_final_sorted.json'
    srcData = JSON.parse(readFileSync(alt, 'utf8'))
  }

  const rows = srcData.rows.filter(r => r['創作者']?.trim())
  console.log(`📝 準備匯入 ${rows.length} 筆資料...`)

  // 4. Map rows to DB schema
  const records = rows.map(r => ({
    data_source:          r['資料來源'] ?? null,
    is_paid:              r['已匯款'] ?? '否',
    cooperation_type:     r['合作型式'] ?? null,
    tier:                 r['等級'] ?? null,
    year:                 r['年度'] ?? null,
    start_date:           /^\d{4}-\d{2}-\d{2}$/.test(r['開始日期'] ?? '') ? r['開始日期'] : null,
    end_date:             /^\d{4}-\d{2}-\d{2}$/.test(r['結束日期'] ?? '') ? r['結束日期'] : null,
    raw_date_text:        r['合作日期原始'] ?? null,
    creator_name:         r['創作者'].trim(),
    platform:             normalizePlatform(r['社群平台']),
    social_url:           r['連結'] ?? null,
    product:              r['合作產品'] ?? null,
    group_buy_system:     r['開團系統'] ?? null,
    content_format:       r['素材形式'] ?? null,
    owner:                normalizeOwner(r['接洽負責人']),
    status:               r['合作狀態'] ?? null,
    discount:             r['團購折數'] ?? null,
    commission_rate:      toFloat(r['分潤比例']),
    fee_excl_tax:         toInt(r['合作費用未稅']),
    fee_incl_tax:         toInt(r['合作費用含稅']),
    order_count:          toInt(r['訂單數量']),
    revenue_excl_tax:     toInt(r['營收未稅']),
    commission_excl_tax:  toInt(r['分潤金額未稅']),
    aov:                  toInt(r['客單價']),
    ad_authorization:     r['廣告主授權'] ?? null,
    quote_note:           r['報價備註'] ?? null,
    shipping_info:        r['收件資訊'] ?? null,
    bank_info:            r['匯款資訊'] ?? null,
    paid_amount:          toInt(r['匯款金額']),
    paid_date:            /^\d{4}-\d{2}-\d{2}$/.test(r['付款日'] ?? '') ? r['付款日'] : null,
    labor_report_no:      r['勞報號'] ?? null,
    paid_match_note:      r['匯款資料備註'] ?? null,
    is_potential_duplicate: r['可能重複'] != null && r['可能重複'] !== '' && r['可能重複'] !== false,
  }))

  // 5. Batch insert (100 per batch)
  let inserted = 0
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100)
    const { ok, status, body } = await rest('/cooperations', {
      method: 'POST',
      body: JSON.stringify(batch),
    })
    if (!ok) {
      console.error(`\n❌ 第 ${i + 1}–${i + batch.length} 筆失敗 (${status}):`, JSON.stringify(body).slice(0, 300))
    } else {
      inserted += batch.length
      process.stdout.write(`\r   ${inserted}/${records.length} 筆完成`)
    }
  }

  // 6. Verify
  const finalRes = await rest('/cooperations?select=id')
  const finalCount = finalRes.body?.length ?? 0
  console.log(`\n\n🎉 完成！插入 ${inserted} 筆（DB 確認：${finalCount} 筆）`)
  console.log('📍 http://localhost:3030/tools/cooperations')
}

main().catch(e => { console.error(e); process.exit(1) })
