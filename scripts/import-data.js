#!/usr/bin/env node
/**
 * 匯入現有資料到 Google Sheets
 * 執行：node scripts/import-data.js
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

// ── 寫入工具 ──────────────────────────────────────────────
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

// ── 1. 匯款追蹤 ────────────────────────────────────────────
async function importPayments() {
  console.log('\n📦 匯入匯款追蹤...')
  const data = require('/Volumes/MU P100 1TB/claude_司/營運匯款資料/remittance_data.json')

  const rows = data.map((r, i) => {
    const status = r.confirmed ? '已確認' : r.is_paid ? '已付款' : '未付款'
    // 判斷發票/稅務類型
    let taxType = ''
    const inv = (r.invoice || '').trim()
    if (inv.startsWith('Z') || inv.match(/^[A-Z]{2}\d{8}$/)) taxType = '發票'
    else if (inv.includes('勞報單')) taxType = '勞報單'
    else if (inv.includes('收據')) taxType = '收據'
    else if (inv) taxType = inv

    return [
      `pay-${String(i + 1).padStart(4, '0')}`, // id
      r.content || '',                           // content
      r.due_date || '',                          // dueDate
      r.paid_date || '',                         // paidDate
      r.amount || '',                            // amount
      taxType,                                   // taxType
      r.confirmed || '',                         // docConfirmed
      inv,                                       // docRef
      (r.bank_info || '').replace(/\n/g, ' | '), // bankInfo
      r.notes || '',                             // note
      status,                                    // status
    ]
  })

  await clearSheet('匯款追蹤')
  await appendRows('匯款追蹤', rows)
  console.log(`  ✅ 匯款追蹤完成：${rows.length} 筆`)
}

// ── 2. 公關名單 ────────────────────────────────────────────
async function importPrList() {
  console.log('\n📦 匯入公關名單...')
  const wb = XLSX.readFile('/Volumes/MU P100 1TB/claude_司/公關/公關自邀名單 (2).xlsx')
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws)

  const rows = data.map((r, i) => {
    // 從連結猜平台
    const link = r['連結'] || ''
    let platform = ''
    if (link.includes('instagram')) platform = 'Instagram'
    else if (link.includes('youtube') || link.includes('youtu.be')) platform = 'YouTube'
    else if (link.includes('facebook') || link.includes('fb.')) platform = 'Facebook'
    else if (link.includes('tiktok')) platform = 'TikTok'
    else if (link.includes('xiaohongshu') || link.includes('xhslink')) platform = '小紅書'

    return [
      `pr-${String(i + 1).padStart(4, '0')}`, // id
      r['姓名'] || '',                          // name
      platform,                                 // platform
      String(r['粉絲數'] || ''),                // followers
      r['商品'] || '',                          // category
      link,                                     // link
      '',                                       // email
      r['聯絡狀況'] || '',                      // contact
      '',                                       // address
      r['合作方式'] || '',                      // notes
      r['是否合作'] || '',                      // status
      '',                                       // lastCoopDate
      new Date().toISOString().split('T')[0],   // createdAt
    ]
  })

  await clearSheet('公關名單')
  await appendRows('公關名單', rows)
  console.log(`  ✅ 公關名單完成：${rows.length} 筆`)
}

// ── 3. 團購紀錄 ────────────────────────────────────────────
async function importTeamBuy() {
  console.log('\n📦 匯入團購紀錄...')
  const files = [
    '/Volumes/MU P100 1TB/claude_司/KOC團購/報表/KOC團購報表｜2025 (3).xlsx',
    '/Volumes/MU P100 1TB/claude_司/KOC團購/報表/KOC團購報表｜2026.xlsx',
  ]

  let allRows = []
  for (const file of files) {
    const wb = XLSX.readFile(file)
    const ws = wb.Sheets['團購報表']
    if (!ws) continue
    const data = XLSX.utils.sheet_to_json(ws)
    allRows = allRows.concat(data)
  }

  // 去重（同 KOL + 開團日期）
  const seen = new Set()
  const deduped = allRows.filter(r => {
    const key = `${r['KOL']}-${r['開團日期']}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const rows = deduped.map((r, i) => {
    // 處理 Excel 日期數字
    let openDate = r['開團日期'] || ''
    if (typeof openDate === 'number') {
      const d = XLSX.SSF.parse_date_code(openDate)
      openDate = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
    }

    return [
      `tb-${String(i + 1).padStart(4, '0')}`,        // id
      String(r['年度'] || ''),                         // year
      String(openDate),                                // openDate
      r['KOL'] || '',                                  // kol
      r['進度'] || '',                                 // status
      String(r['團購折數'] || ''),                     // discount
      r['開團來源'] || '',                             // source
      r['開團系統'] || '',                             // system
      r['負責人'] || '',                               // owner
      String(r['分潤%數'] || ''),                      // commission
      String(r['分潤金額（匯給團購主的$)'] || ''),     // notes
      new Date().toISOString().split('T')[0],          // createdAt
    ]
  })

  await clearSheet('團購紀錄')
  await appendRows('團購紀錄', rows)
  console.log(`  ✅ 團購紀錄完成：${rows.length} 筆`)
}

// ── 主程式 ────────────────────────────────────────────────
async function main() {
  console.log('🚀 開始匯入資料...')
  await importPayments()
  await importPrList()
  await importTeamBuy()
  console.log('\n🎉 所有資料匯入完成！')
}

main().catch(err => {
  console.error('❌ 錯誤：', err.message)
  process.exit(1)
})
