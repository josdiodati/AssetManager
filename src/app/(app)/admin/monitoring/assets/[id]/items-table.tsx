use client

import { useMemo, useState } from react
import type { ZabbixHostItem } from @/lib/zabbix-client

type ItemsTableProps = {
  items: ZabbixHostItem[]
}

function formatAbsoluteDate(value?: string | null) {
  if (!value) return —
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return —

  return new Intl.DateTimeFormat(es-AR, {
    dateStyle: medium,
    timeStyle: short,
    timeZone: UTC,
  }).format(new Date(timestamp * 1000))
}

function formatRelativeTime(value?: string | null) {
  if (!value) return —
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return —

  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - timestamp)
  if (diffSeconds < 60) return hace unos segundos
  if (diffSeconds < 3600) return `hace ${Math.floor(diffSeconds / 60)} min`
  if (diffSeconds < 86400) return `hace ${Math.floor(diffSeconds / 3600)} h`
  if (diffSeconds < 604800) return `hace ${Math.floor(diffSeconds / 86400)} d`

  return formatAbsoluteDate(value)
}

export function ItemsTable({ items }: ItemsTableProps) {
  const [query, setQuery] = useState()

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items

    return items.filter((item) =>
      item.name.toLowerCase().includes(term) ||
      item.key_.toLowerCase().includes(term)
    )
  }, [items, query])

  return (
    <div className=space-y-3>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder=Filtrar por nombre o key...
        className=flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring md:max-w-sm
      />

      {filteredItems.length === 0 ? (
        <p className=text-sm text-muted-foreground>No hay items que coincidan con el filtro.</p>
      ) : (
        <div className=overflow-x-auto>
          <table className=w-full text-sm>
            <thead>
              <tr className=border-b>
                <th className=py-2 text-left>Nombre</th>
                <th className=py-2 text-left>Key</th>
                <th className=py-2 text-left>Último valor</th>
                <th className=py-2 text-left>Unidades</th>
                <th className=py-2 text-left>Último check</th>
                <th className=py-2 text-left>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const notSupported = item.state === 1

                return (
                  <tr key={item.itemid} className=border-b last:border-0>
                    <td className=py-2 pr-3 align-top>{item.name}</td>
                    <td className=py-2 pr-3 align-top font-mono text-xs>{item.key_}</td>
                    <td className=py-2 pr-3 align-top>{item.lastvalue || —}</td>
                    <td className=py-2 pr-3 align-top>{item.units || —}</td>
                    <td className=py-2 pr-3 align-top>
                      <div>{formatRelativeTime(item.lastclock)}</div>
                      <div className=text-xs text-muted-foreground>{formatAbsoluteDate(item.lastclock)}</div>
                    </td>
                    <td className={`py-2 align-top font-medium ${notSupported ? text-red-600 : text-green-700}`}>
                      {notSupported ? Not supported : Normal}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
