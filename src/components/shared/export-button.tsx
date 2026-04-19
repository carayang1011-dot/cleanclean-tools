'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ExportButtonProps<T extends Record<string, any>> {
  data: T[]
  columns: { key: keyof T; label: string }[]
  filename?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ExportButton<T extends Record<string, any>>({
  data,
  columns,
  filename = 'export',
}: ExportButtonProps<T>) {
  const handleExport = () => {
    const headers = columns.map(c => c.label).join(',')
    const rows = data.map(row =>
      columns
        .map(c => {
          const val = String(row[c.key] ?? '')
          // Escape commas and quotes for CSV
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val
        })
        .join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const bom = '\uFEFF' // UTF-8 BOM for Excel
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `${filename}_${date}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      匯出 CSV
    </Button>
  )
}
