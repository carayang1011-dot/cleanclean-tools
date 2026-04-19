import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envRaw = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
const env = {}
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY  = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const HDR  = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function rest(path, opts = {}) {
  const r = await fetch(`${BASE}/rest/v1${path}`, { headers: HDR, ...opts })
  const text = await r.text()
  return { status: r.status, ok: r.ok, body: text ? JSON.parse(text) : null }
}

// 1. Delete test row
await rest('/design_requests?activity_name=eq.__TEST__', { method: 'DELETE' })
console.log('🧹 清除測試資料')

// 2. Check if new columns exist
const colCheck = await rest('/design_requests?select=requester_name,designer_name,imported_from_sheet,source_row&limit=1')
const colsExist = colCheck.ok
console.log(`\n📋 migration 欄位已存在: ${colsExist}`)
if (!colsExist) console.log('   錯誤:', colCheck.body)

// 3. Count existing imported records
const countRes = await rest('/design_requests?select=id&imported_from_sheet=not.is.null')
const existingCount = countRes.ok ? countRes.body?.length : 0
console.log(`\n📊 現有 imported 資料: ${existingCount} 筆`)

// 4. Count total
const totalRes = await rest('/design_requests?select=id')
const total = totalRes.ok ? totalRes.body?.length : 0
console.log(`   總資料: ${total} 筆`)

console.log('\n✅ 準備就緒，欄位狀態確認完成')
console.log(`   columns exist: ${colsExist}`)
