import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { readSheet, appendRow, updateRow, deleteRow } from '@/lib/sheets/helpers'
import type { Shipment, ShipmentFormData, ShipmentProduct } from '@/lib/types/shipping'

const SHEET_NAME = '公關寄件'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const rows = await readSheet(SHEET_NAME)
    return NextResponse.json({ data: rows as unknown as Shipment[] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body: ShipmentFormData = await request.json()

    const result = await appendRow(SHEET_NAME, {
      campaign: body.campaign,
      date: body.date,
      source: body.source,
      orderNo: body.orderNo,
      recipient: body.recipient,
      phone: body.phone,
      address: body.address,
      notes: body.notes,
      products: JSON.stringify(body.products),
      tmsStatus: 'pending',
      tmsOrderId: '',
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request, 'admin')
  if (auth instanceof NextResponse) return auth

  try {
    const { id, products, ...rest } = await request.json()
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

    const data: Record<string, string> = { ...rest }
    if (products) {
      data.products = Array.isArray(products) ? JSON.stringify(products) : products
    }

    const result = await updateRow(SHEET_NAME, id, data)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request, 'admin')
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

    const result = await deleteRow(SHEET_NAME, id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
