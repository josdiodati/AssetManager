'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export interface AuditLogFilters {
  tenantId?: string
  entityType?: string
  action?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
}

async function resolveEntityNames(logs: any[]): Promise<Record<string, string>> {
  const byType: Record<string, string[]> = {}
  for (const log of logs) {
    if (!byType[log.entityType]) byType[log.entityType] = []
    if (!byType[log.entityType].includes(log.entityId)) {
      byType[log.entityType].push(log.entityId)
    }
  }

  const names: Record<string, string> = {}

  if (byType['asset']?.length) {
    const assets = await prisma.asset.findMany({
      where: { id: { in: byType['asset'] } },
      select: { id: true, assetTag: true, serialNumber: true },
    })
    for (const a of assets) {
      names[a.id] = a.assetTag + (a.serialNumber ? ' (' + a.serialNumber + ')' : '')
    }
  }

  if (byType['person']?.length) {
    const persons = await prisma.person.findMany({
      where: { id: { in: byType['person'] } },
      select: { id: true, name: true, email: true },
    })
    for (const p of persons) {
      names[p.id] = p.name + (p.email ? ' — ' + p.email : '')
    }
  }

  if (byType['user']?.length) {
    const users = await prisma.user.findMany({
      where: { id: { in: byType['user'] } },
      select: { id: true, name: true, email: true },
    })
    for (const u of users) {
      names[u.id] = u.name + (u.email ? ' — ' + u.email : '')
    }
  }

  if (byType['tenant']?.length) {
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: byType['tenant'] } },
      select: { id: true, name: true },
    })
    for (const t of tenants) {
      names[t.id] = t.name
    }
  }

  return names
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const { role, tenantId: userTenantId, activeTenantId } = session.user
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 50

  const where: any = {}

  if (role === 'SUPER_ADMIN') {
    if (filters.tenantId) where.tenantId = filters.tenantId
  } else if (role === 'INTERNAL_ADMIN') {
    where.tenantId = activeTenantId
  } else {
    where.tenantId = userTenantId
  }

  if (filters.entityType) where.entityType = filters.entityType
  if (filters.action) where.action = filters.action
  if (filters.userId) where.userId = filters.userId

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59, 999)
      where.createdAt.lte = to
    }
  }

  if (filters.search) {
    where.OR = [
      { entityId: { contains: filters.search, mode: 'insensitive' } },
      { action: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  const entityNames = await resolveEntityNames(logs)

  return { logs, total, page, pageSize, isSuperAdmin: role === 'SUPER_ADMIN', entityNames }
}

export async function getAuditEntityTypes(): Promise<string[]> {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  const rows = await prisma.auditLog.findMany({
    select: { entityType: true },
    distinct: ['entityType'],
    orderBy: { entityType: 'asc' },
  })
  return rows.map((r) => r.entityType)
}
