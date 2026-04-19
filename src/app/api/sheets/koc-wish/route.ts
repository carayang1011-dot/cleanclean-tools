import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { readSheet, appendRow, updateRow, deleteRow } from '@/lib/sheets/helpers'
import type { KocWish, KocWishFormData } from '@/lib/types/koc-wish'

const SHEET_NAME = '合作許願清單'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const rows = await readSheet(SHEET_NAME)
    return NextResponse.json({ data: rows as unknown as KocWish[] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body: KocWishFormData = await request.json()

    const result = await appendRow(SHEET_NAME, {
      kocName: body.kocName,
      platform: body.platform,
      kocLink: body.kocLink,
      followers: body.followers,
      collabType: body.collabType,
      product: body.product,
      reason: body.reason,
      submittedBy: body.submittedBy || auth.profile.name,
      status: '待審核',
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
    const { id, ...data } = await request.json()
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

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
