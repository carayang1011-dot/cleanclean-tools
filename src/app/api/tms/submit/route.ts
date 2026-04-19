import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { readSheet, updateRow } from '@/lib/sheets/helpers'
import { submitOrderToTms } from '@/lib/tms/submit-order'
import { getTmsConfig } from '@/lib/tms/client'
import type { Shipment, ShipmentProduct } from '@/lib/types/shipping'

const SHEET_NAME = '公關寄件'

export async function POST(request: NextRequest) {
  // Admin only
  const auth = await verifyAuth(request, 'admin')
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

    // Read shipment data from sheets
    const rows = await readSheet(SHEET_NAME) as unknown as Shipment[]
    const shipment = rows.find(r => r.id === id)

    if (!shipment) {
      return NextResponse.json({ error: '找不到該寄件記錄' }, { status: 404 })
    }

    if (shipment.tmsStatus === 'tms_sent') {
      return NextResponse.json({ error: '此訂單已同步到 TMS，不可重複送出' }, { status: 400 })
    }

    // Parse products
    let products: ShipmentProduct[] = []
    try {
      products = typeof shipment.products === 'string'
        ? JSON.parse(shipment.products)
        : shipment.products
    } catch {
      return NextResponse.json({ error: '品項資料格式錯誤' }, { status: 400 })
    }

    const { companyCode } = getTmsConfig()

    // Submit to TMS
    const result = await submitOrderToTms({
      companyCode,
      orderNo: shipment.orderNo,
      recipient: shipment.recipient,
      phone: shipment.phone,
      address: shipment.address,
      notes: shipment.notes,
      products,
    })

    if (!result.success) {
      // Update status to failed
      await updateRow(SHEET_NAME, id, { tmsStatus: 'tms_failed' })
      return NextResponse.json({ error: `TMS 送出失敗：${result.error}` }, { status: 500 })
    }

    // Update status to sent
    await updateRow(SHEET_NAME, id, {
      tmsStatus: 'tms_sent',
      tmsOrderId: result.tmsOrderId ?? '',
    })

    return NextResponse.json({
      success: true,
      tmsOrderId: result.tmsOrderId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
