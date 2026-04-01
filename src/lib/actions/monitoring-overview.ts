'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getHostsHealthBatch, type HostHealth, type HealthStatus } from '@/lib/zabbix-client'

const HEALTH_STATUSES: HealthStatus[] = ['HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN', 'DISABLED']

const monitoredAssetInclude = {
  asset: {
    select: {
      id: true,
      assetTag: true,
      description: true,
      status: true,
      ipAddress: true,
      hostname: true,
      tenantId: true,
      tenant: { select: { id: true, name: true } },
      assetType: { select: { id: true, name: true } },
    },
  },
  zone: {
    select: {
      id: true,
      name: true,
      zabbixProxyName: true,
      wireguardEndpoint: true,
      location: { select: { site: true, area: true } },
    },
  },
} satisfies Prisma.AssetMonitoringInclude

type MonitoredAssetRecord = Prisma.AssetMonitoringGetPayload<{ include: typeof monitoredAssetInclude }>

function isHealthStatus(value: string | null | undefined): value is HealthStatus {
  return !!value && HEALTH_STATUSES.includes(value as HealthStatus)
}

export async function getMonitoringOverview() {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const role = session.user.role
  if (!['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(role)) {
    throw new Error('Unauthorized')
  }

  const tenantId = session.user.tenantId
  if (role !== 'SUPER_ADMIN' && !tenantId) {
    throw new Error('Unauthorized')
  }

  const monitoredAssetsWhere: Prisma.AssetMonitoringWhereInput = role === 'SUPER_ADMIN'
    ? { monitoringEnabled: true }
    : { monitoringEnabled: true, asset: { tenantId: tenantId! } }

  const probesWhere: Prisma.MonitoringZoneWhereInput = role === 'SUPER_ADMIN'
    ? { active: true }
    : { active: true, integration: { tenantId: tenantId! } }

  const integrationsWhere: Prisma.MonitoringIntegrationWhereInput = role === 'SUPER_ADMIN'
    ? { enabled: true }
    : { tenantId: tenantId!, enabled: true }

  const [monitoredAssets, probes, integrations, templates] = await Promise.all([
    prisma.assetMonitoring.findMany({
      where: monitoredAssetsWhere,
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: monitoredAssetInclude,
    }),
    prisma.monitoringZone.findMany({
      where: probesWhere,
      orderBy: { name: 'asc' },
      include: {
        location: { select: { site: true, area: true } },
        integration: { select: { tenant: { select: { name: true } } } },
      },
    }),
    prisma.monitoringIntegration.findMany({
      where: integrationsWhere,
      select: {
        id: true,
        tenantId: true,
        zabbixUrl: true,
        zabbixApiToken: true,
        enabled: true,
      },
    }),
    prisma.monitoringTemplate.findMany({
      where: { active: true },
      select: {
        id: true,
        assetTypeName: true,
        zabbixTemplateName: true,
        zabbixTemplateId: true,
        protocol: true,
        defaultPort: true,
        snmpCommunity: true,
      },
    }),
  ])

  const templatesByAssetType = new Map(templates.map((template) => [template.assetTypeName, template]))
  const integrationsByTenant = new Map(integrations.map((integration) => [integration.tenantId, integration]))
  const healthByHostId = new Map<string, HostHealth>()

  const assetsByTenant = new Map<string, MonitoredAssetRecord[]>()
  for (const asset of monitoredAssets) {
    const assetTenantId = asset.asset.tenantId
    const list = assetsByTenant.get(assetTenantId) ?? []
    list.push(asset)
    assetsByTenant.set(assetTenantId, list)
  }

  await Promise.all(Array.from(assetsByTenant.entries()).map(async ([assetTenantId, tenantAssets]) => {
    const integration = integrationsByTenant.get(assetTenantId)
    if (!integration?.enabled) return

    const hostIds = tenantAssets
      .map((asset) => asset.zabbixHostId)
      .filter((hostId): hostId is string => Boolean(hostId))

    if (hostIds.length === 0) return

    try {
      const healthList = await getHostsHealthBatch({
        url: integration.zabbixUrl,
        apiToken: integration.zabbixApiToken,
      }, hostIds)

      for (const health of healthList) {
        healthByHostId.set(health.hostId, health)
      }
    } catch (error) {
      console.error(`[Monitoring Overview] Failed to fetch Zabbix health for tenant ${assetTenantId}:`, error)
    }
  }))

  const enrichedMonitoredAssets = monitoredAssets.map((item) => ({
    ...item,
    health: item.zabbixHostId ? healthByHostId.get(item.zabbixHostId) ?? null : null,
    monitoringTemplate: item.templateOverride
      ? {
          id: null,
          assetTypeName: item.asset.assetType?.name ?? null,
          zabbixTemplateName: item.templateOverride,
          zabbixTemplateId: null,
          protocol: null,
          defaultPort: null,
          snmpCommunity: null,
        }
      : item.asset.assetType?.name
        ? templatesByAssetType.get(item.asset.assetType.name) ?? null
        : null,
  }))

  const stats = enrichedMonitoredAssets.reduce(
    (acc, item) => {
      const health = item.health?.health
      acc.total += 1

      if (!health || health === 'UNKNOWN') {
        acc.unknown += 1
      } else if (health === 'HEALTHY') {
        acc.healthy += 1
      } else if (health === 'WARNING') {
        acc.warning += 1
      } else if (health === 'CRITICAL') {
        acc.critical += 1
      } else if (health === 'DISABLED') {
        acc.disabled += 1
      }

      const dbStatus = isHealthStatus(item.status) ? item.status : null
      if (!health && dbStatus === 'DISABLED') {
        acc.disabled += 1
        acc.unknown -= 1
      }

      return acc
    },
    { total: 0, healthy: 0, warning: 0, critical: 0, unknown: 0, disabled: 0 },
  )

  return {
    stats,
    monitoredAssets: enrichedMonitoredAssets,
    probes,
  }
}
