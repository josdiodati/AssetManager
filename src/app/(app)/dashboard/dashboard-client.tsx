'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Package, CheckCircle, UserCheck, Clock, Wrench } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { getDashboardStats, getDashboardChartData } from '@/lib/actions/dashboard'

const actionLabels: Record<string, string> = {
  ASSIGNED: 'Asignó',
  UNASSIGNED: 'Desasignó',
  REASSIGNED: 'Reasignó',
}

function fmt(date: Date) {
  return format(new Date(date), "d MMM HH:mm", { locale: es })
}

type ChartData = {
  byStatus: { status: string; label: string; count: number; color: string }[]
  byType: { name: string; count: number }[]
  byMonth: { month: string; count: number }[]
}

type DashboardData = {
  stats: { total: number; available: number; assigned: number; pendingApproval: number; inRepair: number }
  recentAssets: any[]
  recentHistory: any[]
}

export function DashboardClient({
  data,
  chartData,
  currentRole,
  initialTenantId,
  tenants = [],
}: {
  data: DashboardData
  chartData: ChartData
  currentRole: string
  initialTenantId: string | null
  tenants?: { id: string; name: string }[]
}) {
  const showSelector = currentRole === 'SUPER_ADMIN' || currentRole === 'INTERNAL_ADMIN'

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(initialTenantId)
  const [currentData, setCurrentData] = useState<DashboardData>(data)
  const [currentChartData, setCurrentChartData] = useState<ChartData>(chartData)
  const [isPending, startTransition] = useTransition()

  function handleTenantChange(value: string) {
    const newTenantId = value === '__all__' ? null : value
    setSelectedTenantId(newTenantId)
    startTransition(async () => {
      const [newData, newChart] = await Promise.all([
        getDashboardStats(newTenantId),
        getDashboardChartData(newTenantId),
      ])
      setCurrentData(newData)
      setCurrentChartData(newChart)
    })
  }

  const { stats, recentAssets, recentHistory } = currentData

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Resumen del inventario</p>
        </div>

        {/* Tenant selector for SUPER_ADMIN and INTERNAL_ADMIN */}
        {showSelector && tenants.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Filtrar por cliente:</span>
            <Select
              value={selectedTenantId ?? '__all__'}
              onValueChange={handleTenantChange}
              disabled={isPending}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Seleccioná un cliente…" />
              </SelectTrigger>
              <SelectContent>
                {currentRole === 'SUPER_ADMIN' && (
                  <SelectItem value="__all__">Todos los clientes</SelectItem>
                )}
                {tenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPending && (
              <span className="text-xs text-muted-foreground">Cargando…</span>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-2 lg:grid-cols-5 gap-4 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
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

      {/* Charts */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {/* Chart 1: Donut by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activos por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {currentChartData.byStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={currentChartData.byStatus}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {currentChartData.byStatus.map((entry, i) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(value: any, name: any) => [value, name]} />
                  <Legend
                    formatter={(value) => <span className="text-xs">{value}</span>}
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Horizontal bar by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activos por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {currentChartData.byType.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={currentChartData.byType}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                  />
                  <ReTooltip />
                  <Bar dataKey="count" name="Cantidad" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 3: Area by month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Altas por mes (12m)</CardTitle>
          </CardHeader>
          <CardContent>
            {currentChartData.byMonth.every(m => m.count === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={currentChartData.byMonth}
                  margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                  <ReTooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Activos"
                    stroke="#6366f1"
                    fill="url(#colorCount)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
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
