'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  RowSelectionState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  searchPlaceholder?: string
  searchColumn?: string
  onRowSelectionChange?: (selectedRows: TData[]) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  searchPlaceholder = '搜尋...',
  searchColumn,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pageSize, setPageSize] = useState(20)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(newSelection)
      if (onRowSelectionChange) {
        const selectedRows = table.getSelectedRowModel().rows.map(r => r.original)
        onRowSelectionChange(selectedRows)
      }
    },
    state: {
      sorting,
      globalFilter,
      rowSelection,
      pagination: { pageIndex: 0, pageSize },
    },
  })

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="max-w-xs h-9 text-sm"
        />
        {onRowSelectionChange && Object.keys(rowSelection).length > 0 && (
          <span className="text-sm text-muted-foreground">
            已選 {Object.keys(rowSelection).length} 筆
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40">
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-semibold text-muted-foreground py-3"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-muted-foreground/50">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                  暫無資料
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>每頁</span>
          <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map(n => (
                <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>共 {table.getFilteredRowModel().rows.length} 筆</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            上一頁
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            下一頁
          </Button>
        </div>
      </div>
    </div>
  )
}
