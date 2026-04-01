'use server'
import { syncAssetToZabbix, unsyncAssetFromZabbix } from "@/lib/zabbix-client"
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ─── Integration (per-tenant Zabbix/Grafana config) ──────────────────────────

export async function getMonitoringIntegration(tenantId: string) {
  return prisma.monitoringIntegration.findUnique({ where: { tenantId } })
}

export async function upsertMonitoringIntegration(tenantId: string, data: {
  zabbixUrl: string; zabbixApiToken: string;
  zabbixHostGroupId?: string; zabbixHostGroupName?: string;
  grafanaUrl?: string; grafanaOrgId?: number;
  grafanaApiToken?: string; grafanaDashboardUid?: string;
  enabled: boolean;
}) {
  const session = await auth()
  if (!session || !['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }
  const result = await prisma.monitoringIntegration.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  })
  revalidatePath('/admin/monitoring')
  return result
}

// ─── Zones ───────────────────────────────────────────────────────────────────

export async function getMonitoringZones(tenantId: string) {
  const integration = await prisma.monitoringIntegration.findUnique({
    where: { tenantId },
    select: { id: true },
  })
  if (!integration) return []
  return prisma.monitoringZone.findMany({
    where: { integrationId: integration.id, active: true },
    orderBy: { name: 'asc' },
    include: { location: { select: { id: true, site: true, area: true } } },
  })
}

export async function createMonitoringZone(tenantId: string, data: {
  name: string; locationId?: string; zabbixProxyId?: string; zabbixProxyName?: string;
  wireguardEndpoint?: string; wireguardPubKey?: string; notes?: string;
}) {
  const session = await auth()
  if (!session || !['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }
  const integration = await prisma.monitoringIntegration.findUnique({
    where: { tenantId },
    select: { id: true },
  })
  if (!integration) throw new Error('Primero configurá la integración de monitoreo para este cliente')
  const zone = await prisma.monitoringZone.create({
    data: { integrationId: integration.id, ...data },
  })
  revalidatePath('/admin/monitoring/zones')
  return zone
}

export async function updateMonitoringZone(id: string, data: Partial<{
  name: string; locationId: string; zabbixProxyId: string; zabbixProxyName: string;
  wireguardEndpoint: string; wireguardPubKey: string; notes: string; active: boolean;
}>) {
  const session = await auth()
  if (!session || !['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }
  const zone = await prisma.monitoringZone.update({ where: { id }, data })
  revalidatePath('/admin/monitoring/zones')
  return zone
}

export async function deleteMonitoringZone(id: string) {
  const session = await auth()
  if (!session || !['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }
  await prisma.monitoringZone.update({ where: { id }, data: { active: false } })
  revalidatePath('/admin/monitoring/zones')
}

// ─── Templates (AssetType → Zabbix Template mapping) ─────────────────────────

export async function getMonitoringTemplates() {
  return prisma.monitoringTemplate.findMany({
    where: { active: true },
    orderBy: { assetTypeName: 'asc' },
  })
}

export async function createMonitoringTemplate(data: {
  assetTypeName: string; zabbixTemplateName: string; zabbixTemplateId?: string;
  protocol: string; defaultPort?: number; snmpCommunity?: string;
}) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }
  const template = await prisma.monitoringTemplate.create({ data: data as any })
  revalidatePath('/admin/monitoring/templates')
  return template
}

export async function updateMonitoringTemplate(id: string, data: Partial<{
  assetTypeName: string; zabbixTemplateName: string; zabbixTemplateId: string;
  protocol: string; defaultPort: number; snmpCommunity: string; active: boolean;
}>) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }
  const template = await prisma.monitoringTemplate.update({ where: { id }, data: data as any })
  revalidatePath('/admin/monitoring/templates')
  return template
}

export async function deleteMonitoringTemplate(id: string) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }
  await prisma.monitoringTemplate.update({ where: { id }, data: { active: false } })
  revalidatePath('/admin/monitoring/templates')
}

// ─── Asset Monitoring (link asset ↔ Zabbix) ──────────────────────────────────

export async function getAssetMonitoring(assetId: string) {
  return prisma.assetMonitoring.findUnique({
    where: { assetId },
    include: { zone: { select: { id: true, name: true } } },
  })
}

export async function upsertAssetMonitoring(assetId: string, data: {
  monitoringEnabled: boolean;
  zoneId?: string | null;
  templateOverride?: string | null;
  snmpCommunity?: string | null;
  monitoringIpAddress?: string | null;
  monitoringHostname?: string | null;
}) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') {
    throw new Error('Unauthorized')
  }

  if (!data.monitoringEnabled) {
    // Disable monitoring — also disable in Zabbix if it was synced
    const existing = await prisma.assetMonitoring.findUnique({ where: { assetId } })
    if (existing) {
      if (existing.zabbixHostId) {
        // Fire-and-forget: disable in Zabbix (don't block on errors)
        unsyncAssetFromZabbix(assetId).catch(console.error)
      } else {
        await prisma.assetMonitoring.update({
          where: { assetId },
          data: { monitoringEnabled: false, status: 'DISABLED' },
        })
      }
    }
    revalidatePath(`/assets/${assetId}`)
    return null
  }

  // Enable or update monitoring
  const result = await prisma.assetMonitoring.upsert({
    where: { assetId },
    create: {
      assetId,
      monitoringEnabled: true,
      status: 'PENDING',
      zoneId: data.zoneId || null,
      templateOverride: data.templateOverride || null,
      snmpCommunity: data.snmpCommunity || null,
      monitoringIpAddress: data.monitoringIpAddress || null,
      monitoringHostname: data.monitoringHostname || null,
    },
    update: {
      monitoringEnabled: true,
      status: 'PENDING',
      zoneId: data.zoneId || null,
      templateOverride: data.templateOverride || null,
      snmpCommunity: data.snmpCommunity || null,
      monitoringIpAddress: data.monitoringIpAddress || null,
      monitoringHostname: data.monitoringHostname || null,
    },
  })

  // Trigger Zabbix sync (async, don't block the UI)
  syncAssetToZabbix(assetId).catch(err => {
    console.error(`[Zabbix Sync] Failed for asset ${assetId}:`, err)
  })

  revalidatePath(`/assets/${assetId}`)
  return result
}

// ─── Grafana Provisioning ────────────────────────────────────────────────────

export async function provisionGrafana(tenantId: string) {
  const session = await auth()
  if (!session || !['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  const { provisionGrafanaForTenant } = await import('@/lib/grafana-client')
  const result = await provisionGrafanaForTenant(tenantId)
  revalidatePath('/admin/monitoring')
  return result
}
