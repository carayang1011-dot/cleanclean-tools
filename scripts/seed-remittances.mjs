// scripts/seed-remittances.mjs
// 將 D:/claude_司/營運匯款資料/remittance_data.json 匯入 Supabase remittances 表

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const JSON_PATH = path.resolve(__dirname, '../../營運匯款資料/remittance_data.json')

function parseDate(val) {
  if (!val) return null
  const s = String(val).trim()
  if (!s) return null
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

async function main() {
  console.log('讀取 JSON...')
  const raw = JSON.parse(readFileSync(JSON_PATH, 'utf-8'))
  console.log(`共 ${raw.length} 筆`)

  const rows = raw.map(r => ({
    month:        String(r.month ?? '').trim(),
    due_date:     r.due_date ? String(r.due_date).trim() : null,
    paid_date:    parseDate(r.paid_date),
    confirmed:    r.confirmed === 'V' || r.confirmed === true,
    invoice:      r.invoice ? String(r.invoice).trim() : null,
    amount:       typeof r.amount === 'number' ? r.amount : null,
    bank_info:    r.bank_info ? String(r.bank_info).trim() : null,
    content:      String(r.content ?? '').trim(),
    notes:        r.notes ? String(r.notes).trim() : null,
    account_name: r.account_name ? String(r.account_name).trim() : null,
    collab_name:  r.collab_name ? String(r.collab_name).trim() : null,
    is_paid:      r.is_paid === true,
  })).filter(r => r.content && r.month)

  console.log(`有效筆數：${rows.length}`)

  // 分批插入，衝突時跳過（idempotent）
  const BATCH = 100
  let inserted = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { data, error } = await supabase
      .from('remittances')
      .insert(batch)
      .select('id')

    if (error) {
      console.error(`❌ 第 ${i + 1}-${i + batch.length} 筆失敗：`, error.message)
    } else {
      const count = data?.length ?? 0
      inserted += count
      console.log(`✅ 第 ${i + 1}-${i + batch.length} 筆：新增 ${count}`)
    }
  }

  console.log(`\n完成！新增 ${inserted} 筆，略過重複 ${skipped} 筆`)
}

main().catch(e => { console.error(e); process.exit(1) })
