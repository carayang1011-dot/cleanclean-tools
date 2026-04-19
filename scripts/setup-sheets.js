#!/usr/bin/env node
/**
 * 自動建立 Google Sheets 工作表表頭
 * 填好 .env.local 後執行：node scripts/setup-sheets.js
 */

require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')

const SHEETS_CONFIG = [
  {
    name: 'KOC許願',
    headers: ['id', 'kocName', 'platform', 'kocLink', 'followers', 'collabType', 'product', 'reason', 'submittedBy', 'status', 'createdAt'],
  },
  {
    name: '匯款追蹤',
    headers: ['id', 'content', 'dueDate', 'paidDate', 'amount', 'taxType', 'docConfirmed', 'docRef', 'bankInfo', 'note', 'status'],
  },
  {
    name: '公關寄件',
    headers: ['id', 'campaign', 'date', 'source', 'orderNo', 'recipient', 'phone', 'address', 'notes', 'products', 'tmsStatus', 'tmsOrderId', 'createdAt'],
  },
  {
    name: '合作排程',
    headers: ['id', 'startDate', 'endDate', 'name', 'platform', 'type', 'revenue', 'orders', 'avgOrder', 'commission', 'status', 'progress', 'owner', 'notes', 'createdAt'],
  },
  {
    name: '團購紀錄',
    headers: ['id', 'year', 'openDate', 'kol', 'status', 'discount', 'source', 'system', 'owner', 'commission', 'notes', 'createdAt'],
  },
  {
    name: '公關邀約',
    headers: ['id', 'owner', 'status', 'type', 'name', 'followers', 'link', 'product', 'contactLog', 'quote', 'finalSpec', 'note', 'address', 'createdAt'],
  },
  {
    name: '公關名單',
    headers: ['id', 'name', 'platform', 'followers', 'category', 'link', 'email', 'contact', 'address', 'notes', 'status', 'lastCoopDate', 'createdAt'],
  },
  {
    name: 'UTM歷史',
    headers: ['id', 'label', 'baseUrl', 'source', 'medium', 'campaign', 'term', 'content', 'generatedUrl', 'shortUrl', 'category', 'notes', 'createdBy', 'createdAt'],
  },
]

async function main() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID

  if (!email || !key || !spreadsheetId) {
    console.error('❌ 請先填好 .env.local 的三個 Google 變數：')
    console.error('   GOOGLE_SERVICE_ACCOUNT_EMAIL')
    console.error('   GOOGLE_PRIVATE_KEY')
    console.error('   GOOGLE_SPREADSHEET_ID')
    process.exit(1)
  }

  const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  const sheets = google.sheets({ version: 'v4', auth })

  // 取得現有工作表清單
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const existing = new Set(meta.data.sheets.map(s => s.properties.title))

  for (const { name, headers } of SHEETS_CONFIG) {
    if (existing.has(name)) {
      console.log(`⏭  "${name}" 已存在，跳過`)
      continue
    }

    // 新增工作表
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: name } } }] },
    })

    // 寫入表頭
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${name}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    })

    console.log(`✅ "${name}" 建立完成（${headers.length} 欄）`)
  }

  console.log('\n🎉 所有工作表設定完成！可以開始使用了。')
}

main().catch(err => {
  console.error('❌ 錯誤：', err.message)
  process.exit(1)
})
