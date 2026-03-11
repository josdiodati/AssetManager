'use client'
import { useState, useTransition } from 'react'
import { getAuditLogs, AuditLogFilters } from '@/lib/actions/audit'
import { ChevronDown, ChevronRight, ChevronLeft, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ACTION_LABELS: Record<string, string> = {
  asset_created: 'Activo creado',
  asset_updated: 'Activo actualizado',
  asset_deleted: 'Activo eliminado',
  asset_assigned: 'Activo asignado',
  asset_unassigned: 'Activo desasignado',
  asset_reassigned: 'Activo reasignado',
  assignment_created: 'Asignación creada',
  assignment_accepted: 'Asignación aceptada',
  assignment_rejected: 'Asignación rechazada',
  approval_submitted: 'Aprobación enviada',
  approval_approved: 'Aprobación aprobada',
  approval_rejected: 'Aprobación rechazada',
  acceptance_token_generated: 'Token de aceptación generado',
  acceptance_accepted: 'Aceptación confirmada',
  acceptance_declined: 'Aceptación rechazada',
  user_created: 'Usuario creado',
  user_updated: 'Usuario actualizado',
  user_deleted: 'Usuario eliminado',
  person_created: 'Persona creada',
  person_updated: 'Persona actualizada',
  person_deleted: 'Persona eliminada',
  tenant_created: 'Cliente creado',
  tenant_updated: 'Cliente actualizado',
  import_completed: 'Importación completada',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
}

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ')
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Log {
  id: string
  createdAt: Date | string
  action: string
  entityType: string
  entityId: string
  source: string
  afterData: any
  user: { name: string; email: string } | null
  tenant: { name: string } | null
}

interface Props {
  initialLogs: Log[]
  initialTotal: number
  isSuperAdmin: boolean
  entityTypes: string[]
  initialEntityNames: Record<string, string>
}

export function AuditClient({ initialLogs, initialTotal, isSuperAdmin, entityTypes, initialEntityNames }: Props) {
  const [logs, setLogs] = useState<Log[]>(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [entityNames, setEntityNames] = useState<Record<string, string>>(initialEntityNames)
  const pageSize = 50
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [filters, setFilters] = useState<AuditLogFilters>({
    entityType: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  })

  const totalPages = Math.ceil(total / pageSize)

  function applyFilters(newFilters: AuditLogFilters, newPage = 1) {
    startTransition(async () => {
      const result = await getAuditLogs({ ...newFilters, page: newPage, pageSize })
      setLogs(result.logs as unknown as Log[])
      setTotal(result.total)
      setPage(newPage)
      setEntityNames(result.entityNames)
    })
  }

  function handleFilterChange(key: keyof AuditLogFilters, value: string) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  function handleSearch() { applyFilters(filters, 1) }
  function handleReset() {
    const cleared = { entityType: '', dateFrom: '', dateTo: '', search: '' }
    setFilters(cleared)
    applyFilters(cleared, 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
        <span className="text-sm text-muted-foreground">{total} registros</span>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.entityType}
            onChange={(e) => handleFilterChange('entityType', e.target.value)}
          >
            <option value="">Todas las entidades</option>
            {entityTypes.map((et) => (
              <option key={et} value={et}>{et}</option>
            ))}
          </select>
          <Input type="date" value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} className="text-sm" />
          <Input type="date" value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} className="text-sm" />
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSearch} disabled={isPending}>{isPending ? 'Buscando...' : 'Buscar'}</Button>
          <Button size="sm" variant="outline" onClick={handleReset} disabled={isPending}>Limpiar</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 w-8"></th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                {isSuperAdmin && <th className="px-4 py-3 text-left font-medium text-gray-600">Tenant</th>}
                <th className="px-4 py-3 text-left font-medium text-gray-600">Usuario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Entidad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Acción</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">
                    No hay registros de auditoría
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 text-gray-400">
                      {expandedId === log.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    {isSuperAdmin && <td className="px-4 py-3 text-gray-700">{log.tenant?.name ?? '-'}</td>}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{log.user?.name ?? 'Sistema'}</div>
                      {log.user?.email && <div className="text-xs text-gray-400">{log.user.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-mono">
                        {log.entityType}
                      </span>
                      <div className="mt-0.5">
                        {entityNames[log.entityId] ? (
                          <span className="text-sm font-medium text-gray-800">{entityNames[log.entityId]}</span>
                        ) : (
                          <span className="text-xs text-gray-400 font-mono">{log.entityId.slice(0, 8)}…</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{formatAction(log.action)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{log.source}</td>
                  </tr>
                  {expandedId === log.id && log.afterData && (
                    <tr key={`${log.id}-detail`} className="bg-gray-50">
                      <td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-3">
                        <div className="text-xs font-semibold text-gray-500 mb-2">Detalles</div>
                        <pre className="text-xs bg-white border rounded p-3 overflow-x-auto text-gray-700 max-h-60 overflow-y-auto">
                          {JSON.stringify(log.afterData, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-600">
              Página {page} de {totalPages} — {total} registros
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => applyFilters(filters, page - 1)} disabled={page <= 1 || isPending}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => applyFilters(filters, page + 1)} disabled={page >= totalPages || isPending}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
