'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

function getTenantFilter(session: any): string | null {
  if (session.user.role === 'SUPER_ADMIN') return null
  if (session.user.role === 'INTERNAL_ADMIN') return session.user.activeTenantId
  return session.user.tenantId
}

export async function getAlerts(tenantIdOverride?: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const tenantId = tenantIdOverride ?? getTenantFilter(session)

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  const baseWhere: any = { deletedAt: null }
  if (tenantId) baseWhere.tenantId = tenantId

  const include = {
    assetType: { select: { name: true } },
    assignedPerson: { select: { name: true } },
    tenant: { select: { name: true } },
  }

  const [expiringSoon, eolSoon, expired] = await Promise.all([
    // Warranty expiring within 30 days (but not yet expired)
    prisma.asset.findMany({
      where: {
        ...baseWhere,
        warrantyExpiresAt: { gte: now, lte: in30Days },
      },
      include,
      orderBy: { warrantyExpiresAt: 'asc' },
    }),

    // EOL approaching within 60 days
    prisma.asset.findMany({
      where: {
        ...baseWhere,
        eolDate: { gte: now, lte: in60Days },
      },
      include,
      orderBy: { eolDate: 'asc' },
    }),

    // Warranty already expired and asset is still active (not decommissioned/obsolete)
    prisma.asset.findMany({
      where: {
        ...baseWhere,
        warrantyExpiresAt: { lt: now },
        status: { notIn: ['DECOMMISSIONED', 'OBSOLETE'] },
      },
      include,
      orderBy: { warrantyExpiresAt: 'asc' },
    }),
  ])

  return { expiringSoon, eolSoon, expired }
}

export async function getAlertCount(tenantIdOverride?: string): Promise<number> {
  const session = await auth()
  if (!session) return 0

  const tenantId = tenantIdOverride ?? getTenantFilter(session)

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  const baseWhere: any = { deletedAt: null }
  if (tenantId) baseWhere.tenantId = tenantId

  const [a, b, c] = await Promise.all([
    prisma.asset.count({ where: { ...baseWhere, warrantyExpiresAt: { gte: now, lte: in30Days } } }),
    prisma.asset.count({ where: { ...baseWhere, eolDate: { gte: now, lte: in60Days } } }),
    prisma.asset.count({ where: { ...baseWhere, warrantyExpiresAt: { lt: now }, status: { notIn: ['DECOMMISSIONED', 'OBSOLETE'] } } }),
  ])

  return a + b + c
}
