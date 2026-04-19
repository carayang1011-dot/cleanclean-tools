import { NextRequest, NextResponse } from 'next/server'
import { appendRow } from '@/lib/sheets/helpers'

const SHEET = '公關邀約'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await appendRow(SHEET, {
      name:          body.name          ?? '',
      platform:      body.platform      ?? '',
      accountLink:   body.accountLink   ?? '',
      followers:     body.followers     ?? '',
      email:         body.email         ?? '',
      phone:         body.phone         ?? '',
      address:       body.address       ?? '',
      product:       body.product       ?? '',
      notes:         body.notes         ?? '',
      status:        '待審核',
      createdAt:     new Date().toISOString(),
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
  }
}
