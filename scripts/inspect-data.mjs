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
const HDR  = { apikey: KEY, Authorization: `Bearer ${KEY}` }

// Get sample of existing data
const r = await fetch(`${BASE}/rest/v1/design_requests?select=*&limit=3&order=id.asc`, { headers: HDR })
const rows = await r.json()
console.log('📄 前3筆資料:')
console.log(JSON.stringify(rows, null, 2))

// Check all column names
const r2 = await fetch(`${BASE}/rest/v1/design_requests?select=*&limit=1`, { headers: HDR })
const sample = await r2.json()
if (sample[0]) {
  console.log('\n📋 現有欄位:')
  console.log(Object.keys(sample[0]).join(', '))
}

// Count by status
const statusRes = await fetch(`${BASE}/rest/v1/design_requests?select=status`, { headers: HDR })
const all = await statusRes.json()
const counts = {}
all.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1 })
console.log('\n📊 狀態分布:', counts)
console.log('   總計:', all.length, '筆')
