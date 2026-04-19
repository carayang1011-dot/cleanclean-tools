import { getSheets, getSpreadsheetId } from './client'

// Convert sheet rows (string[][]) to object[] using first row as headers
function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (!rows || rows.length < 2) return []
  const [headers, ...dataRows] = rows
  return dataRows
    .filter(row => row.some(cell => cell !== ''))
    .map(row =>
      headers.reduce<Record<string, string>>((obj, header, i) => {
        obj[header] = row[i] ?? ''
        return obj
      }, {})
    )
}

// Convert object to row values in header order
function objectToRow(headers: string[], data: Record<string, string>): string[] {
  return headers.map(h => data[h] ?? '')
}

// Read all rows from a sheet, returns array of objects
export async function readSheet(sheetName: string): Promise<Record<string, string>[]> {
  const sheets = getSheets()
  const spreadsheetId = getSpreadsheetId()

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  })

  return rowsToObjects((res.data.values ?? []) as string[][])
}

// Append a new row; auto-generates id if not provided
export async function appendRow(
  sheetName: string,
  data: Record<string, string>
): Promise<{ success: boolean; id: string }> {
  const sheets = getSheets()
  const spreadsheetId = getSpreadsheetId()

  // Get headers from first row
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  })
  const headers = (headerRes.data.values?.[0] ?? []) as string[]

  const id = data.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const rowData = { ...data, id }
  const row = objectToRow(headers, rowData)

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  })

  return { success: true, id }
}

// Update a row by id (matches first column named 'id')
export async function updateRow(
  sheetName: string,
  id: string,
  data: Record<string, string>
): Promise<{ success: boolean }> {
  const sheets = getSheets()
  const spreadsheetId = getSpreadsheetId()

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  })
  const rows = (res.data.values ?? []) as string[][]
  if (rows.length < 2) return { success: false }

  const headers = rows[0]
  const idColIndex = headers.indexOf('id')
  if (idColIndex === -1) return { success: false }

  const rowIndex = rows.findIndex((row, i) => i > 0 && row[idColIndex] === id)
  if (rowIndex === -1) return { success: false }

  const existingObj = headers.reduce<Record<string, string>>((obj, h, i) => {
    obj[h] = rows[rowIndex][i] ?? ''
    return obj
  }, {})
  const merged = { ...existingObj, ...data, id }
  const updatedRow = objectToRow(headers, merged)

  const sheetRowNumber = rowIndex + 1 // 1-indexed
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${sheetRowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updatedRow] },
  })

  return { success: true }
}

// Delete a row by id (clears the row)
export async function deleteRow(
  sheetName: string,
  id: string
): Promise<{ success: boolean }> {
  const sheets = getSheets()
  const spreadsheetId = getSpreadsheetId()

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  })
  const rows = (res.data.values ?? []) as string[][]
  if (rows.length < 2) return { success: false }

  const headers = rows[0]
  const idColIndex = headers.indexOf('id')
  if (idColIndex === -1) return { success: false }

  const rowIndex = rows.findIndex((row, i) => i > 0 && row[idColIndex] === id)
  if (rowIndex === -1) return { success: false }

  const sheetRowNumber = rowIndex + 1

  // Get the sheet's numeric sheetId
  const metaRes = await sheets.spreadsheets.get({ spreadsheetId })
  const sheet = metaRes.data.sheets?.find(s => s.properties?.title === sheetName)
  if (!sheet?.properties?.sheetId) return { success: false }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: sheetRowNumber - 1,
              endIndex: sheetRowNumber,
            },
          },
        },
      ],
    },
  })

  return { success: true }
}

// Batch append multiple rows
export async function batchAppend(
  sheetName: string,
  rows: Record<string, string>[]
): Promise<{ success: boolean; count: number }> {
  const sheets = getSheets()
  const spreadsheetId = getSpreadsheetId()

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  })
  const headers = (headerRes.data.values?.[0] ?? []) as string[]

  const values = rows.map(row => {
    const id = row.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    return objectToRow(headers, { ...row, id })
  })

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })

  return { success: true, count: values.length }
}
