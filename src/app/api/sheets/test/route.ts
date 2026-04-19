import { NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheets/client'

export async function GET() {
  try {
    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    const res = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetNames = res.data.sheets?.map(s => s.properties?.title) ?? []

    return NextResponse.json({
      success: true,
      spreadsheetTitle: res.data.properties?.title,
      sheets: sheetNames,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
