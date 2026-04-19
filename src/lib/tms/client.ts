/**
 * TMS 客戶端（獲利王 weberp.ktnet.com.tw）
 * 使用 Playwright 自動化填寫 TMS 系統
 *
 * 環境變數：
 *   TMS_BASE_URL      = https://weberp.ktnet.com.tw
 *   TMS_COMPANY_CODE  = 公司代號
 *   TMS_USERNAME      = 帳號
 *   TMS_PASSWORD      = 密碼
 */

import { Browser, BrowserContext, chromium } from 'playwright'

// Session 快取（伺服器層級，同 process 共用）
let cachedContext: BrowserContext | null = null
let cachedBrowser: Browser | null = null
let lastLoginAt = 0
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 分鐘

export function getTmsConfig() {
  const baseUrl = process.env.TMS_BASE_URL
  const companyCode = process.env.TMS_COMPANY_CODE
  const username = process.env.TMS_USERNAME
  const password = process.env.TMS_PASSWORD

  if (!baseUrl || !companyCode || !username || !password) {
    throw new Error('Missing TMS credentials in environment variables (TMS_BASE_URL, TMS_COMPANY_CODE, TMS_USERNAME, TMS_PASSWORD)')
  }

  return { baseUrl, companyCode, username, password }
}

function isSessionExpired(): boolean {
  return !cachedContext || Date.now() - lastLoginAt > SESSION_TTL_MS
}

export async function getTmsSession(): Promise<BrowserContext> {
  if (!isSessionExpired() && cachedContext) return cachedContext

  const { baseUrl, companyCode, username, password } = getTmsConfig()

  // Launch browser if not already running
  if (!cachedBrowser) {
    cachedBrowser = await chromium.launch({ headless: true })
  }

  // Close old context if exists
  if (cachedContext) {
    await cachedContext.close().catch(() => {})
    cachedContext = null
  }

  const context = await cachedBrowser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1280, height: 800 },
  })

  const page = await context.newPage()

  try {
    // Navigate to login page
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 30000 })

    // Fill company code, username, password
    // NOTE: Selectors need to be verified against the actual TMS login page
    await page.fill('[name="companyCode"], #companyCode, input[placeholder*="公司"]', companyCode)
    await page.fill('[name="username"], #username, input[placeholder*="帳號"]', username)
    await page.fill('[name="password"], #password, input[type="password"]', password)

    // Submit login form
    await page.click('button[type="submit"], input[type="submit"], .login-btn')
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 })

    // Verify login success (adjust selector based on actual TMS)
    const isLoggedIn = await page.locator('.user-info, .nav-user, .logout').count() > 0
    if (!isLoggedIn) {
      throw new Error('TMS 登入失敗，請確認帳號密碼')
    }

    await page.close()
    cachedContext = context
    lastLoginAt = Date.now()
    return context
  } catch (error) {
    await page.close()
    await context.close()
    throw error
  }
}

export async function closeTmsSession() {
  if (cachedContext) {
    await cachedContext.close().catch(() => {})
    cachedContext = null
  }
  if (cachedBrowser) {
    await cachedBrowser.close().catch(() => {})
    cachedBrowser = null
  }
}
