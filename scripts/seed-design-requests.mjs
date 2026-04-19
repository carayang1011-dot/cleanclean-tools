/**
 * Seed script: import 892 historical design requests.
 * Uses anon key (no service_role needed).
 * Names are stored in notes as "歷史匯入 | 設計師:X | 發案:Y"
 *
 * Usage: npm run seed:design-requests
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

// ── Category → slug mapping ──────────────────────────────────────
const CATEGORY_TO_SLUG = {
  '官網-1月活動': 'website-activity',  '官網-2月活動': 'website-activity',
  '官網-3月活動': 'website-activity',  '官網-4月活動': 'website-activity',
  '官網-5月活動': 'website-activity',  '門市旗艦店':   'flagship-store',
  '百貨-快閃櫃':  'department-popup',  '百貨館內宣傳輸出': 'department-instore',
  '蝦皮活動需求': 'shopee',            'MO店+活動需求': 'mo-store',
  'Line@專區':   'line-at',           'FB廣告圖文':   'fb-ads',
  '團購':         'group-buy',        '粉專需求':     'facebook-page',
  'CRM需求':      'crm',              'CRM-VIP需求':  'crm-vip',
  '戶外廣告':     'outdoor-ads',      '異業合作':     'cross-industry',
  '小瑄需求':     'distributor',
}

const STATUS_MAP = {
  done: 'completed', in_progress: 'in_progress', pending: 'pending', other: 'completed',
}

async function main() {
  console.log('🌱 開始 seed 設計需求歷史資料（anon key mode）\n')

  // 1. Get channel ID mapping
  const { body: channels } = await rest('/channels?select=id,slug&order=sort_order')
  if (!channels) { console.error('❌ 無法讀取 channels'); process.exit(1) }
  const slugToId = Object.fromEntries(channels.map(c => [c.slug, c.id]))
  console.log(`✅ 找到 ${channels.length} 個 channel`)

  // 2. Delete existing historical imports
  const { body: existing } = await rest('/design_requests?select=id&notes=like.*歷史匯入*')
  const existingCount = existing?.length ?? 0
  if (existingCount > 0) {
    console.log(`⚠️  清除 ${existingCount} 筆舊歷史資料...`)
    await rest('/design_requests?notes=like.*歷史匯入*', { method: 'DELETE' })
    console.log('   清除完成')
  }

  // 3. Load seed data
  const seedData = JSON.parse(readFileSync(join(__dirname, 'design-requests-seed.json'), 'utf8'))
  const items = seedData.items.filter(item => item.campaign?.trim())
  console.log(`\n📝 準備匯入 ${items.length} 筆資料...`)

  // 4. Build rows (using existing columns only)
  const rows = items.map(item => {
    const noteParts = ['歷史匯入']
    if (item.designer) noteParts.push(`設計師:${item.designer}`)
    if (item.requester) noteParts.push(`發案:${item.requester}`)
    noteParts.push(`來源:${item.category}`)
    if (item.notes) noteParts.push(`備註:${item.notes}`)

    return {
      channel_id:      slugToId[CATEGORY_TO_SLUG[item.category]] ?? null,
      activity_period: item.period ?? null,
      activity_name:   item.campaign ?? '(未命名)',
      purpose:         item.purpose ?? '(未填)',
      size_spec:       item.size ?? null,
      quantity:        typeof item.quantity === 'number' ? item.quantity : 1,
      copywriting:     item.copy ?? null,
      product_info:    item.product ?? null,
      deadline:        /^\d{4}-\d{2}-\d{2}$/.test(item.deadline ?? '') ? item.deadline : null,
      status:          STATUS_MAP[item.status] ?? 'completed',
      priority:        'normal',
      notes:           noteParts.join(' | '),
    }
  })

  // 5. Batch insert (100 rows per batch)
  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { ok, status, body } = await rest('/design_requests', {
      method: 'POST',
      body: JSON.stringify(batch),
    })
    if (!ok) {
      console.error(`\n❌ 第 ${i + 1}–${i + batch.length} 筆失敗 (${status}):`, JSON.stringify(body).slice(0, 200))
    } else {
      inserted += batch.length
      process.stdout.write(`\r   ${inserted}/${rows.length} 筆完成`)
    }
  }

  // 6. Verify
  const { body: finalAll } = await rest('/design_requests?select=id&notes=like.*歷史匯入*')
  const finalCount = finalAll?.length ?? 0
  console.log(`\n\n🎉 完成！插入 ${inserted} 筆（DB 確認歷史資料：${finalCount} 筆）`)
  console.log('📍 http://localhost:3030/tools/pr-invite/design-request')
}

main().catch(e => { console.error(e); process.exit(1) })
