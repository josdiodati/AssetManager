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
