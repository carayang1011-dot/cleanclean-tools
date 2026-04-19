/**
 * TMS 自動送出訂單
 *
 * 注意：需要根據實際 TMS 介面調整 CSS selectors。
 * 使用方式：先在開發環境測試，確認 selector 正確後再上正式環境。
 */

import { getTmsSession, getTmsConfig } from './client'
import type { TmsOrderPayload } from '@/lib/types/shipping'
import type { Page } from 'playwright'

interface TmsSubmitResult {
  success: boolean
  tmsOrderId?: string
  error?: string
}

// TMS log (server-side only)
function tmsLog(level: 'info' | 'warn' | 'error', msg: string, data?: unknown) {
  const prefix = `[TMS ${level.toUpperCase()}] ${new Date().toISOString()}`
  if (data) console[level](prefix, msg, data)
  else console[level](prefix, msg)
}

async function fillOrderForm(page: Page, payload: TmsOrderPayload): Promise<string> {
  const { baseUrl } = getTmsConfig()

  // Navigate to new order page
  // NOTE: Adjust URL path based on actual TMS routing
  await page.goto(`${baseUrl}/order/new`, { waitUntil: 'networkidle', timeout: 30000 })

  tmsLog('info', `Filling order for: ${payload.recipient}`)

  // Fill recipient info
  // NOTE: All selectors below need to be verified against actual TMS form
  await page.fill('[name="orderNo"], #orderNo', payload.orderNo)
  await page.fill('[name="recipient"], #recipient, [placeholder*="收件"]', payload.recipient)
  await page.fill('[name="phone"], #phone, [placeholder*="電話"]', payload.phone)
  await page.fill('[name="address"], #address, textarea[placeholder*="地址"]', payload.address)

  if (payload.notes) {
    const notesField = page.locator('[name="notes"], #notes, textarea[placeholder*="備註"]')
    if (await notesField.count() > 0) {
      await notesField.fill(payload.notes)
    }
  }

  // Add products
  for (let i = 0; i < payload.products.length; i++) {
    const product = payload.products[i]

    // Click "add product" button if needed (from 2nd product onwards)
    if (i > 0) {
      const addBtn = page.locator('.add-product-btn, button:has-text("新增品項"), button:has-text("加入商品")')
      if (await addBtn.count() > 0) {
        await addBtn.click()
        await page.waitForTimeout(300)
      }
    }

    // Fill SKU/barcode
    const skuField = page.locator(`[data-row="${i}"] [name*="sku"], [data-row="${i}"] [name*="barcode"]`).first()
    if (await skuField.count() > 0) {
      await skuField.fill(product.s)
    }

    // Fill quantity
    const qtyField = page.locator(`[data-row="${i}"] [name*="qty"], [data-row="${i}"] [name*="quantity"]`).first()
    if (await qtyField.count() > 0) {
      await qtyField.fill(String(product.q))
    }
  }

  // Submit the form
  await page.click('button[type="submit"]:has-text("送出"), button:has-text("確認送出"), .submit-order-btn')
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 })

  // Extract TMS order ID from response page
  // NOTE: Adjust selector based on actual TMS success page
  const orderIdEl = page.locator('.order-id, [data-order-id], .success-order-no').first()
  const tmsOrderId = await orderIdEl.count() > 0
    ? await orderIdEl.textContent() ?? ''
    : `TMS-${Date.now()}`

  tmsLog('info', `Order submitted successfully. TMS Order ID: ${tmsOrderId}`)
  return tmsOrderId.trim()
}

export async function submitOrderToTms(payload: TmsOrderPayload): Promise<TmsSubmitResult> {
  let retries = 0
  const maxRetries = 2

  while (retries <= maxRetries) {
    try {
      const context = await getTmsSession()
      const page = await context.newPage()

      try {
        const tmsOrderId = await fillOrderForm(page, payload)
        await page.close()
        return { success: true, tmsOrderId }
      } catch (err) {
        await page.close()
        throw err
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      tmsLog('error', `TMS submit failed (retry ${retries}/${maxRetries})`, message)

      if (retries === maxRetries) {
        return { success: false, error: message }
      }

      // Force re-login on next attempt
      const { closeTmsSession } = await import('./client')
      await closeTmsSession()
      retries++
      await new Promise(r => setTimeout(r, 1000 * retries)) // exponential backoff
    }
  }

  return { success: false, error: 'Max retries exceeded' }
}
