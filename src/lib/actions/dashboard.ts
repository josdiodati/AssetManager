'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function getDashboardStats(tenantId?: string | null) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const effectiveTenantId = tenantId ?? (session.user.role === 'CLIENT_ADMIN' ? session.user.tenantId : session.user.activeTenantId)

  const where: any = { deletedAt: null }
  if (effectiveTenantId) where.tenantId = effectiveTenantId

  const historyWhere: any = effectiveTenantId ? { asset: { tenantId: effectiveTenantId } } : {}

  const [
    total,
    available,
    assigned,
    pendingApproval,
    inRepair,
    recentAssets,
    recentHistory,
  ] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.count({ where: { ...where, status: 'AVAILABLE' } }),
    prisma.asset.count({ where: { ...where, status: 'ASSIGNED' } }),
    prisma.asset.count({ where: { ...where, status: 'PENDING_APPROVAL' } }),
    prisma.asset.count({ where: { ...where, status: 'IN_REPAIR' } }),
    prisma.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        assetType: { select: { name: true } },
        brand: { select: { name: true } },
      },
    }),
    prisma.assignmentHistory.findMany({
      where: historyWhere,
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        asset: { select: { assetTag: true } },
        toPerson: { select: { name: true } },
        fromPerson: { select: { name: true } },
        performedBy: { select: { name: true } },
      },
    }),
  ])

  return {
    stats: { total, available, assigned, pendingApproval, inRepair },
    recentAssets,
    recentHistory,
  }
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Disponible', color: '#22c55e' },
  ASSIGNED: { label: 'Asignado', color: '#3b82f6' },
  IN_REPAIR: { label: 'En reparación', color: '#f97316' },
  DECOMMISSIONED: { label: 'Desafectado', color: '#9ca3af' },
  OBSOLETE: { label: 'Obsoleto', color: '#64748b' },
  PENDING_APPROVAL: { label: 'Pend. aprobación', color: '#eab308' },
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export async function getDashboardChartData(tenantId: string | null) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const where: any = { deletedAt: null }
  if (tenantId) where.tenantId = tenantId

  // By status
  const statusGroups = await prisma.asset.groupBy({
    by: ['status'],
    where,
    _count: { id: true },
  })

  const byStatus = statusGroups.map(g => ({
    status: g.status,
    label: STATUS_META[g.status]?.label ?? g.status,
    count: g._count.id,
    color: STATUS_META[g.status]?.color ?? '#94a3b8',
  }))

  // By type (top 8)
  const typeGroups = await prisma.asset.groupBy({
    by: ['assetTypeId'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  })

  const typeIds = typeGroups.map(g => g.assetTypeId).filter(Boolean) as string[]
  const types = typeIds.length > 0
    ? await prisma.assetType.findMany({ where: { id: { in: typeIds } }, select: { id: true, name: true } })
    : []
  const typeMap = Object.fromEntries(types.map(t => [t.id, t.name]))

  const byType = typeGroups
    .filter(g => g.assetTypeId)
    .map(g => ({
      name: typeMap[g.assetTypeId!] ?? 'Sin tipo',
      count: g._count.id,
    }))

  // By month (last 12 months)
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const monthlyAssets = await prisma.asset.findMany({
    where: {
      ...where,
      createdAt: { gte: twelveMonthsAgo },
    },
    select: { createdAt: true },
  })

  // Build month buckets
  const monthBuckets: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    monthBuckets[key] = 0
  }
  for (const a of monthlyAssets) {
    const d = new Date(a.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (key in monthBuckets) monthBuckets[key]++
  }

  const byMonth = Object.entries(monthBuckets).map(([key, count]) => {
    const [year, monthIdx] = key.split('-').map(Number)
    return { month: MONTH_LABELS[monthIdx], count }
  })

  return { byStatus, byType, byMonth }
}
