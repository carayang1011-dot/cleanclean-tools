#!/usr/bin/env node
/**
 * 匯入 UTM 歷史資料到 Google Sheets
 * 執行：node scripts/import-utm.js
 */

require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')
const XLSX = require('xlsx')
const { randomUUID } = require('crypto')

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

const auth = new google.auth.JWT({
  email, key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })

async function appendRows(sheetName, rows) {
  if (!rows.length) return
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: batch },
    })
    console.log(`  ✓ 已寫入第 ${i + 1}–${Math.min(i + BATCH, rows.length)} 筆`)
  }
}

async function clearSheet(sheetName) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:ZZ`,
  })
}

function parseUrl(generatedUrl) {
  if (!generatedUrl) return { baseUrl: '', source: '', medium: '', campaign: '', term: '', content: '' }
  try {
    const url = new URL(generatedUrl)
    return {
      baseUrl: url.origin + url.pathname,
      source: url.searchParams.get('utm_source') || '',
      medium: url.searchParams.get('utm_medium') || '',
      campaign: url.searchParams.get('utm_campaign') || '',
      term: url.searchParams.get('utm_term') || '',
      content: url.searchParams.get('utm_content') || '',
    }
  } catch {
    return { baseUrl: generatedUrl, source: '', medium: '', campaign: '', term: '', content: '' }
  }
}

async function importUtm() {
  console.log('\n📦 匯入 UTM 歷史資料...')
  const wb = XLSX.readFile('/Volumes/MU P100 1TB/claude_司/UTM原始資料/（202508新版) 淨淨｜官網UTM產生器 (1).xlsx')

  // Skip template sheet
  const skipSheets = new Set(['空白範本(複製NO刪)'])
  let allRows = []
  let rowIndex = 1

  for (const sheetName of wb.SheetNames) {
    if (skipSheets.has(sheetName)) continue

    const ws = wb.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

    // Find header row (row 0)
    // Columns: [rowNum, baseUrl, source, medium, campaign, term, content, generatedUrl, notes, lihi]
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const generatedUrl = String(row[7] || '').trim()
      if (!generatedUrl) continue

      const baseUrl = String(row[1] || '').trim()
      const source = String(row[2] || '').trim()
      const medium = String(row[3] || '').trim()
      const campaign = String(row[4] || '').trim()
      const term = String(row[5] || '').trim()
      const content = String(row[6] || '').trim()
      const notes = String(row[8] || '').trim()
      const shortUrl = String(row[9] || '').trim()

      // Use campaign name as label, fallback to source_medium
      const label = campaign || `${source}_${medium}`.replace(/^_|_$/, '') || '未命名'

      allRows.push([
        `utm-${String(rowIndex).padStart(4, '0')}`,  // id
        label,                                          // label
        baseUrl,                                        // baseUrl
        source,                                         // source
        medium,                                         // medium
        campaign,                                       // campaign
        term,                                           // term
        content,                                        // content
        generatedUrl,                                   // generatedUrl
        shortUrl,                                       // shortUrl
        sheetName,                                      // category (sheet name)
        notes,                                          // notes
        '',                                             // createdBy
        new Date().toISOString().split('T')[0],         // createdAt
      ])
      rowIndex++
    }
  }

  await clearSheet('UTM歷史')
  await appendRows('UTM歷史', allRows)
  console.log(`  ✅ UTM歷史完成：${allRows.length} 筆`)
}

async function main() {
  console.log('🚀 開始匯入 UTM 資料...')
  await importUtm()
  console.log('\n🎉 UTM 資料匯入完成！')
}

main().catch(err => {
  console.error('❌ 錯誤：', err.message)
  process.exit(1)
})
