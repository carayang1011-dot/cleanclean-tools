/**
 * 一鍵套用 cooperations 資料表 migration
 * 用法：node scripts/apply-migration.mjs <SERVICE_ROLE_KEY>
 *
 * SERVICE_ROLE_KEY 取得方式：
 *   Supabase Dashboard → Settings → API → service_role (secret)
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Load env
const envRaw = readFileSync(join(root, '.env.local'), 'utf8')
const env = {}
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.argv[2] || env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY || SERVICE_KEY === 'your-service-role-key') {
  console.error(`
❌ 需要 SERVICE_ROLE_KEY

用法:
  node scripts/apply-migration.mjs <service_role_key>

或在 .env.local 加入：
  SUPABASE_SERVICE_ROLE_KEY=eyJ...

SERVICE_ROLE_KEY 取得路徑：
  Supabase Dashboard → ${BASE?.replace('/rest/v1', '') ?? 'https://supabase.com'}/settings/api
  → Project API keys → service_role
`)
  process.exit(1)
}

const sql = readFileSync(join(root, 'supabase', 'migrations', '004_cooperations.sql'), 'utf8')

// Supabase Management API: POST /v1/projects/{ref}/database/query
// Extract project ref from URL
const ref = BASE?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!ref) { console.error('❌ 無法解析 SUPABASE_URL'); process.exit(1) }

console.log(`🔧 套用 migration 到 ${ref}...`)

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

if (res.ok) {
  console.log('✅ Migration 套用成功！')
  console.log('👉 現在執行：npm run seed:cooperations')
} else {
  const body = await res.text()
  // Try alternative: service role via supabase REST
  console.log(`⚠️  Management API 失敗 (${res.status})，嘗試 service role 直接套用...`)

  // Split SQL into individual statements and try direct execution via supabase-js
  console.log(`
📋 請手動在 Supabase SQL Editor 執行以下 SQL：
   https://supabase.com/dashboard/project/${ref}/sql/new

SQL 檔案位置：supabase/migrations/004_cooperations.sql
`)
  console.error('Management API 回應:', body.slice(0, 300))
  process.exit(1)
}
