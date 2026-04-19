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

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 測試 anon key 存取能力...')
console.log(`URL: ${URL}`)

// Test 1: Read profiles (setup page does this without auth)
const r1 = await fetch(`${URL}/rest/v1/profiles?select=id,name,role&limit=3`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
})
console.log(`\n1. profiles SELECT: ${r1.status}`)
if (r1.ok) { const d = await r1.json(); console.log(JSON.stringify(d, null, 2)) }
else { console.log(await r1.text()) }

// Test 2: Read design_requests
const r2 = await fetch(`${URL}/rest/v1/design_requests?select=id,status&limit=3`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
})
console.log(`\n2. design_requests SELECT: ${r2.status}`)
if (r2.ok) { const d = await r2.json(); console.log(JSON.stringify(d, null, 2)) }
else { console.log(await r2.text()) }

// Test 3: Insert into design_requests
const testRow = {
  activity_name: '__TEST__',
  purpose: 'test',
  status: 'completed',
  priority: 'normal',
  quantity: 1,
}
const r3 = await fetch(`${URL}/rest/v1/design_requests`, {
  method: 'POST',
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
  body: JSON.stringify(testRow)
})
console.log(`\n3. design_requests INSERT: ${r3.status}`)
console.log(await r3.text())
