import { google } from 'googleapis'

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error('Missing Google service account credentials in environment variables')
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export function getSheets() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

export function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID
  if (!id) throw new Error('Missing GOOGLE_SPREADSHEET_ID in environment variables')
  return id
}
