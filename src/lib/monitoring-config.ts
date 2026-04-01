import { promises as fs } from "fs"
import path from "path"
import YAML from "yaml"
import { prisma } from "@/lib/prisma"

const CONFIG_PATH = process.env.MONITORING_CONFIG_PATH || path.join(process.cwd(), "config", "monitoring.yml")

export type MonitoringConfigFile = {
  version: number
  global?: {
    zabbix?: { url?: string; apiToken?: string }
    grafana?: { url?: string }
  }
  tenants?: Array<{
    tenant: { name?: string; databaseId?: string }
    integration?: {
      enabled?: boolean
      zabbixUrl?: string
      zabbixApiToken?: string
      zabbixHostGroupId?: string
      zabbixHostGroupName?: string
      grafanaUrl?: string
      grafanaOrgId?: number
      grafanaApiToken?: string
      grafanaDashboardUid?: string
    }
    probes?: Array<{
      name: string
      location?: { site?: string; area?: string; databaseId?: string }
      zabbixProxy?: { id?: string; name?: string }
      wireguard?: { endpoint?: string; publicKey?: string }
      notes?: string
    }>
  }>
}

export async function readMonitoringConfig(): Promise<MonitoringConfigFile> {
  const raw = await fs.readFile(CONFIG_PATH, "utf8")
  return YAML.parse(raw) as MonitoringConfigFile
}

async function findTenant(ref: { name?: string; databaseId?: string }) {
  if (ref.databaseId) {
    return prisma.tenant.findUnique({ where: { id: ref.databaseId } })
  }
  if (ref.name) {
    return prisma.tenant.findFirst({ where: { name: ref.name, active: true } })
  }
  return null
}

async function findLocation(tenantId: string, ref?: { site?: string; area?: string; databaseId?: string }) {
  if (!ref) return null
  if (ref.databaseId) {
    return prisma.location.findFirst({ where: { id: ref.databaseId, tenantId, active: true } })
  }
  if (ref.site) {
    return prisma.location.findFirst({
      where: { tenantId, site: ref.site, area: ref.area ?? null, active: true },
    })
  }
  return null
}

export async function syncMonitoringConfigToDatabase() {
  const cfg = await readMonitoringConfig()
  const results: Array<{ tenant: string; integrationId?: string; zones: number }> = []

  for (const tenantEntry of cfg.tenants ?? []) {
    const tenant = await findTenant(tenantEntry.tenant)
    if (!tenant) {
      throw new Error(`Monitoring config tenant not found: ${tenantEntry.tenant.databaseId || tenantEntry.tenant.name || "<unknown>"}`)
    }

    const integrationData = {
      zabbixUrl: tenantEntry.integration?.zabbixUrl || cfg.global?.zabbix?.url || "",
      zabbixApiToken: tenantEntry.integration?.zabbixApiToken || cfg.global?.zabbix?.apiToken || "",
      zabbixHostGroupId: tenantEntry.integration?.zabbixHostGroupId,
      zabbixHostGroupName: tenantEntry.integration?.zabbixHostGroupName,
      grafanaUrl: tenantEntry.integration?.grafanaUrl || cfg.global?.grafana?.url,
      grafanaOrgId: tenantEntry.integration?.grafanaOrgId,
      grafanaApiToken: tenantEntry.integration?.grafanaApiToken,
      grafanaDashboardUid: tenantEntry.integration?.grafanaDashboardUid,
      enabled: tenantEntry.integration?.enabled ?? true,
    }

    if (!integrationData.zabbixUrl) throw new Error(`Missing zabbixUrl for tenant ${tenant.name}`)
    if (!integrationData.zabbixApiToken) throw new Error(`Missing zabbixApiToken for tenant ${tenant.name}`)

    const integration = await prisma.monitoringIntegration.upsert({
      where: { tenantId: tenant.id },
      create: { tenantId: tenant.id, ...integrationData },
      update: integrationData,
    })

    for (const probe of tenantEntry.probes ?? []) {
      const location = await findLocation(tenant.id, probe.location)
      if (probe.location && !location) {
        throw new Error(`Location not found for tenant ${tenant.name}: ${probe.location.databaseId || probe.location.site || "<unknown>"}`)
      }

      const existing = await prisma.monitoringZone.findFirst({
        where: {
          integrationId: integration.id,
          OR: [
            { name: probe.name },
            ...(location ? [{ locationId: location.id }] : []),
          ],
        },
      })

      const zoneData = {
        name: probe.name,
        locationId: location?.id,
        zabbixProxyId: probe.zabbixProxy?.id,
        zabbixProxyName: probe.zabbixProxy?.name,
        wireguardEndpoint: probe.wireguard?.endpoint,
        wireguardPubKey: probe.wireguard?.publicKey,
        notes: probe.notes,
        active: true,
      }

      if (existing) {
        await prisma.monitoringZone.update({ where: { id: existing.id }, data: zoneData })
      } else {
        await prisma.monitoringZone.create({ data: { integrationId: integration.id, ...zoneData } })
      }
    }

    results.push({ tenant: tenant.name, integrationId: integration.id, zones: (tenantEntry.probes ?? []).length })
  }

  return { configPath: CONFIG_PATH, results }
}
