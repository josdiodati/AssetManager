'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import { StatusBadge, ConditionBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, ExternalLink, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { deleteAsset } from '@/lib/actions/assets'
import { toast } from 'sonner'

const statusOptions = [
  { value: 'AVAILABLE', label: 'Disponible' },
  { value: 'ASSIGNED', label: 'Asignado' },
  { value: 'PENDING_APPROVAL', label: 'Pend. Aprobación' },
  { value: 'IN_REPAIR', label: 'En Reparación' },
  { value: 'ON_LOAN', label: 'En Préstamo' },
  { value: 'OBSOLETE', label: 'Obsoleto' },
  { value: 'LOST', label: 'Perdido' },
  { value: 'STOLEN', label: 'Robado' },
  { value: 'DECOMMISSIONED', label: 'Dado de Baja' },
]

type Asset = {
  id: string; assetTag: string; status: string; condition: string;
  serialNumber: string | null; description: string | null;
  assignedArea: string | null; createdAt: Date;
  assetType: { name: string; category: { code: string; name: string } | null } | null;
  brand: { name: string } | null;
  model: { name: string } | null;
  assignedPerson: { name: string; email: string } | null;
  location: { site: string; area: string | null } | null;
}

type AssetType = { id: string; name: string; category: { code: string; name: string } | null }
type Tenant = { id: string; name: string }

interface AssetsClientProps {
  assets: Asset[]
  total: number
  page: number
  pageSize: number
  assetTypes: AssetType[]
  tenants: Tenant[]
  currentRole: string
  currentTenantId: string
  filters: { status?: string; assetTypeId?: string; search?: string }
}

export function AssetsClient({
  assets, total, page, pageSize, assetTypes, currentRole, filters
}: AssetsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'ALL') params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  const totalPages = Math.ceil(total / pageSize)
  const canDelete = currentRole !== 'CLIENT_ADMIN'

  function buildExportUrl() {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.assetTypeId) params.set('assetTypeId', filters.assetTypeId)
    if (filters.search) params.set('search', filters.search)
    const qs = params.toString()
    return `/api/export/assets${qs ? '?' + qs : ''}`
  }

  async function handleDelete(id: string, tag: string) {
    if (!confirm(`¿Dar de baja el activo ${tag}? Esta acción es reversible.`)) return
    try {
      await deleteAsset(id)
      toast.success('Activo dado de baja')
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activos</h1>
          <p className="text-muted-foreground mt-1">{total} activo{total !== 1 ? 's' : ''} en total</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={buildExportUrl()} download>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </a>
          {canDelete && (
            <Link href="/assets/new">
              <Button><Plus className="h-4 w-4 mr-2" />Nuevo Activo</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white border rounded-lg p-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tag, serial, hostname..."
            defaultValue={filters.search}
            className="pl-9"
            onKeyDown={e => { if (e.key === 'Enter') updateFilter('search', (e.target as HTMLInputElement).value) }}
            onChange={e => { if (!e.target.value) updateFilter('search', '') }}
          />
        </div>
        <Select value={filters.status ?? 'ALL'} onValueChange={v => updateFilter('status', v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.assetTypeId ?? 'ALL'} onValueChange={v => updateFilter('assetTypeId', v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos</SelectItem>
            {assetTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filters.status || filters.assetTypeId || filters.search) && (
          <Button variant="ghost" size="sm" onClick={() => router.push('/assets')}>Limpiar filtros</Button>
        )}
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Asset Tag</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Marca / Modelo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Condición</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Asignado a</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ubicación</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {assets.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Sin activos que coincidan con los filtros</td></tr>
            ) : (
              assets.map(asset => (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/assets/${asset.id}`} className="font-mono font-medium text-blue-600 hover:underline">
                      {asset.assetTag}
                    </Link>
                    {asset.serialNumber && <p className="text-xs text-muted-foreground">{asset.serialNumber}</p>}
                  </td>
                  <td className="px-4 py-3">{asset.assetType?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {asset.brand?.name ?? '—'}
                    {asset.model?.name && <span className="text-muted-foreground"> / {asset.model.name}</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={asset.status} /></td>
                  <td className="px-4 py-3"><ConditionBadge condition={asset.condition} /></td>
                  <td className="px-4 py-3">{asset.assignedPerson?.name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">
                    {asset.location ? (
                      <span className="text-xs">{asset.location.site}{asset.location.area ? ` / ${asset.location.area}` : ''}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/assets/${asset.id}`}>
                        <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => updateFilter('page', String(page - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => updateFilter('page', String(page + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
