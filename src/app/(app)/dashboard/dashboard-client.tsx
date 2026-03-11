'use client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Package, CheckCircle, UserCheck, Clock, Wrench } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const actionLabels: Record<string, string> = {
  ASSIGNED: 'Asignó',
  UNASSIGNED: 'Desasignó',
  REASSIGNED: 'Reasignó',
}

function fmt(date: Date) {
  return format(new Date(date), "d MMM HH:mm", { locale: es })
}

export function DashboardClient({ data, currentRole }: {
  data: {
    stats: { total: number; available: number; assigned: number; pendingApproval: number; inRepair: number }
    recentAssets: any[]
    recentHistory: any[]
  }
  currentRole: string
}) {
  const { stats, recentAssets, recentHistory } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen del inventario</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Package className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><UserCheck className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.assigned}</p>
                <p className="text-xs text-muted-foreground">Asignados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingApproval}</p>
                <p className="text-xs text-muted-foreground">Pend. aprobación</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Wrench className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.inRepair}</p>
                <p className="text-xs text-muted-foreground">En reparación</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos activos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin activos registrados aún</p>
            ) : (
              <div className="space-y-3">
                {recentAssets.map((asset: any) => (
                  <div key={asset.id} className="flex items-center justify-between">
                    <div>
                      <Link href={`/assets/${asset.id}`} className="font-mono text-sm font-medium text-blue-600 hover:underline">
                        {asset.assetTag}
                      </Link>
                      <p className="text-xs text-muted-foreground">{asset.assetType?.name ?? '—'}{asset.brand ? ` · ${asset.brand.name}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={asset.status} />
                      <p className="text-xs text-muted-foreground mt-1">{fmt(asset.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin actividad registrada aún</p>
            ) : (
              <div className="space-y-3">
                {recentHistory.map((h: any) => (
                  <div key={h.id} className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <Link href={`/assets/${h.assetId}`} className="font-mono text-blue-600 hover:underline text-xs">{h.asset.assetTag}</Link>
                        <span className="text-muted-foreground mx-1">·</span>
                        <span className="font-medium">{actionLabels[h.action] ?? h.action}</span>
                        {h.toPerson && <span className="text-muted-foreground"> a {h.toPerson.name}</span>}
                        {h.action === 'UNASSIGNED' && h.fromPerson && <span className="text-muted-foreground"> de {h.fromPerson.name}</span>}
                      </p>
                      {h.performedBy && <p className="text-xs text-muted-foreground">por {h.performedBy.name}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">{fmt(h.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
