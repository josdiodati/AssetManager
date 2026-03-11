'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchKeys?: string[]
  actions?: (row: T) => React.ReactNode
}

export function DataTable<T extends Record<string, any>>({
  data, columns, searchPlaceholder = 'Buscar...', searchKeys = [], actions
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? data.filter(row =>
        searchKeys.some(key => String(row[key] ?? '').toLowerCase().includes(search.toLowerCase()))
      )
    : data

  return (
    <div className="space-y-3">
      {searchKeys.length > 0 && (
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map(col => (
                <th key={String(col.key)} className="text-left px-4 py-3 font-medium text-gray-600">
                  {col.header}
                </th>
              ))}
              {actions && <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-muted-foreground">Sin resultados</td></tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={row.id ?? i} className="hover:bg-gray-50 transition-colors">
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-4 py-3">
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '-')}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
