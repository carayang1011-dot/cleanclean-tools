/**
 * 用 Playwright 自動在 Supabase SQL Editor 執行 migration SQL
 */
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const sql = readFileSync(join(root, 'supabase', 'migrations', '004_cooperations.sql'), 'utf8')
const PROJECT_REF = 'hhebbtnkpjjmyoiqtidd'
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`

const browser = await chromium.launch({ headless: false, slowMo: 50 })
const context = await browser.newContext()
const page = await context.newPage()

console.log('🌐 開啟 Supabase SQL Editor...')
await page.goto(SQL_EDITOR_URL)

// Wait for login or editor
await page.waitForLoadState('networkidle')

const url = page.url()
if (url.includes('sign-in') || url.includes('login')) {
  console.log('⚠️  需要登入 Supabase。請在瀏覽器視窗中手動登入，完成後按 Enter 繼續...')
  // Wait for user to login
  await new Promise(resolve => {
    process.stdin.once('data', resolve)
    console.log('登入完成後按 Enter...')
  })
  await page.goto(SQL_EDITOR_URL)
  await page.waitForLoadState('networkidle')
}

console.log('📝 等待 SQL Editor 載入...')

// Wait for the code editor to be ready (Monaco editor)
try {
  await page.waitForSelector('.monaco-editor', { timeout: 15000 })
} catch {
  console.log('嘗試其他 selector...')
  await page.waitForSelector('[data-testid="sql-editor"]', { timeout: 10000 }).catch(() => {})
}

await page.waitForTimeout(2000)

// Click on the editor and paste SQL
console.log('✍️  貼上 SQL...')

// Try to find and click the editor area
const editorArea = await page.$('.monaco-editor .view-lines')
  || await page.$('.monaco-editor')
  || await page.$('[data-testid="sql-editor"] textarea')
  || await page.$('textarea')

if (editorArea) {
  await editorArea.click()
  // Select all existing content and replace
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(300)
  // Type the SQL (using clipboard for speed)
  await page.evaluate((sqlText) => {
    navigator.clipboard?.writeText(sqlText)
  }, sql)
  await page.keyboard.press('Control+v')
  await page.waitForTimeout(500)
}

// Try to run via keyboard shortcut or button
console.log('▶️  執行 SQL...')
await page.keyboard.press('Control+Enter')
await page.waitForTimeout(3000)

// Check for success
const pageContent = await page.content()
if (pageContent.includes('Success') || pageContent.includes('success') || pageContent.includes('CREATE TABLE')) {
  console.log('✅ SQL 執行成功！')
} else {
  console.log('⚠️  請確認瀏覽器中的執行結果，然後按 Enter 繼續...')
  await new Promise(resolve => process.stdin.once('data', resolve))
}

await page.waitForTimeout(2000)
await browser.close()
console.log('\n✅ 完成！現在執行: npm run seed:cooperations')
