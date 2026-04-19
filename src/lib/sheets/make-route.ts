/**
 * Factory for standard CRUD API routes that connect to Google Sheets.
 * Usage: export const { GET, POST, PUT, DELETE } = makeSheetRoute('工作表名稱')
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { readSheet, appendRow, updateRow, deleteRow } from './helpers'

export function makeSheetRoute(sheetName: string) {
  return {
    async GET(request: NextRequest) {
      const auth = await verifyAuth(request)
      if (auth instanceof NextResponse) return auth
      try {
        const rows = await readSheet(sheetName)
        return NextResponse.json({ data: rows })
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
      }
    },

    async POST(request: NextRequest) {
      const auth = await verifyAuth(request)
      if (auth instanceof NextResponse) return auth
      try {
        const body = await request.json()
        const result = await appendRow(sheetName, {
          ...body,
          createdAt: body.createdAt || new Date().toISOString(),
        })
        return NextResponse.json(result, { status: 201 })
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
      }
    },

    async PUT(request: NextRequest) {
      const auth = await verifyAuth(request, 'admin')
      if (auth instanceof NextResponse) return auth
      try {
        const { id, ...data } = await request.json()
        if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })
        const result = await updateRow(sheetName, id, data)
        return NextResponse.json(result)
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
      }
    },

    async DELETE(request: NextRequest) {
      const auth = await verifyAuth(request, 'admin')
      if (auth instanceof NextResponse) return auth
      try {
        const { id } = await request.json()
        if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })
        const result = await deleteRow(sheetName, id)
        return NextResponse.json(result)
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
      }
    },
  }
}
