'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function getMonitoringOverview() {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const role = session.user.role
  if (!['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(role)) {
    throw new Error('Unauthorized')
  }

  const [totalActive, totalPending, totalError, totalDisabled, monitoredAssets, probes] = await Promise.all([
    prisma.assetMonitoring.count({ where: { status: 'ACTIVE', monitoringEnabled: true } }),
    prisma.assetMonitoring.count({ where: { status: 'PENDING', monitoringEnabled: true } }),
    prisma.assetMonitoring.count({ where: { status: 'ERROR', monitoringEnabled: true } }),
    prisma.assetMonitoring.count({ where: { monitoringEnabled: false } }),
    prisma.assetMonitoring.findMany({
      where: { monitoringEnabled: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        asset: {
          select: {
            id: true, assetTag: true, description: true, status: true,
            ipAddress: true, hostname: true,
            tenant: { select: { name: true } },
          },
        },
        zone: {
          select: {
            id: true, name: true, zabbixProxyName: true, wireguardEndpoint: true,
            location: { select: { site: true, area: true } },
          },
        },
      },
    }),
    prisma.monitoringZone.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        location: { select: { site: true, area: true } },
        integration: { select: { tenant: { select: { name: true } } } },
      },
    }),
  ])

  const total = totalActive + totalPending + totalError + totalDisabled

  return {
    stats: { total, active: totalActive, pending: totalPending, error: totalError, disabled: totalDisabled },
    monitoredAssets,
    probes,
  }
}
