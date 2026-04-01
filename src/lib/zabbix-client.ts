'use server'

/**
 * Zabbix JSON-RPC API Client
 * Used by Asset Manager to create/update/delete monitored hosts in Zabbix.
 * Zabbix 7.2+ uses Authorization header (not auth parameter).
 */

interface ZabbixConfig {
  url: string      // e.g. http://localhost:8080/api_jsonrpc.php
  apiToken: string // API token (not session token)
}

interface ZabbixResponse<T = any> {
  jsonrpc: string
  result?: T
  error?: { code: number; message: string; data: string }
  id: number
}

let requestId = 0

async function rpc<T = any>(config: ZabbixConfig, method: string, params: any): Promise<T> {
  requestId++
  const res = await fetch(config.url.replace(/\/?$/, '/api_jsonrpc.php'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiToken}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: requestId }),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Zabbix HTTP ${res.status}: ${res.statusText}`)
  const data: ZabbixResponse<T> = await res.json()
  if (data.error) throw new Error(`Zabbix API [${data.error.code}]: ${data.error.message} — ${data.error.data}`)
  return data.result as T
}

// ─── Host Group ──────────────────────────────────────────────────────────────

export async function ensureHostGroup(config: ZabbixConfig, groupName: string): Promise<string> {
  // Check if exists
  const existing = await rpc<{ groupid: string }[]>(config, 'hostgroup.get', {
    output: ['groupid'],
    filter: { name: [groupName] },
  })
  if (existing.length > 0) return existing[0].groupid

  // Create
  const created = await rpc<{ groupids: string[] }>(config, 'hostgroup.create', {
    name: groupName,
  })
  return created.groupids[0]
}

// ─── Template lookup ─────────────────────────────────────────────────────────

export async function findTemplate(config: ZabbixConfig, templateName: string): Promise<string | null> {
  const results = await rpc<{ templateid: string }[]>(config, 'template.get', {
    output: ['templateid'],
    filter: { host: [templateName] },
  })
  return results.length > 0 ? results[0].templateid : null
}

// ─── Proxy lookup ────────────────────────────────────────────────────────────

export async function findProxy(config: ZabbixConfig, proxyName: string): Promise<string | null> {
  const results = await rpc<{ proxyid: string }[]>(config, 'proxy.get', {
    output: ['proxyid'],
    filter: { name: [proxyName] },
  })
  return results.length > 0 ? results[0].proxyid : null
}

// ─── Host CRUD ───────────────────────────────────────────────────────────────

export interface CreateHostParams {
  hostname: string       // Unique technical name (e.g. asset tag)
  visibleName: string    // Display name
  groupId: string        // Host group ID
  templateIds: string[]  // Template IDs to link
  proxyId?: string       // Proxy to monitor through
  ipAddress?: string     // Agent/SNMP interface IP
  port?: number          // Interface port
  interfaceType?: 1 | 2 | 3 | 4  // 1=agent, 2=SNMP, 3=IPMI, 4=JMX
  snmpCommunity?: string
  description?: string
}

export async function createHost(config: ZabbixConfig, params: CreateHostParams): Promise<string> {
  const ifaceType = params.interfaceType ?? 1
  const ifacePort = params.port?.toString() ?? (ifaceType === 2 ? '161' : '10050')

  const hostData: any = {
    host: params.hostname,
    name: params.visibleName,
    groups: [{ groupid: params.groupId }],
    templates: params.templateIds.map(id => ({ templateid: id })),
    interfaces: [{
      type: ifaceType,
      main: 1,
      useip: 1,
      ip: params.ipAddress || '0.0.0.0',
      dns: '',
      port: ifacePort,
    }],
    description: params.description || '',
  }

  if (params.proxyId) {
    hostData.proxyid = params.proxyId
  }

  // SNMP v2c details for type 2
  if (ifaceType === 2) {
    hostData.interfaces[0].details = {
      version: 2,
      community: params.snmpCommunity || '{$SNMP_COMMUNITY}',
    }
  }

  const result = await rpc<{ hostids: string[] }>(config, 'host.create', hostData)
  return result.hostids[0]
}

export async function updateHost(config: ZabbixConfig, hostId: string, params: Partial<CreateHostParams>): Promise<void> {
  const hostData: any = { hostid: hostId }
  if (params.visibleName) hostData.name = params.visibleName
  if (params.groupId) hostData.groups = [{ groupid: params.groupId }]
  if (params.templateIds) hostData.templates = params.templateIds.map(id => ({ templateid: id }))
  if (params.proxyId) hostData.proxyid = params.proxyId
  if (params.description !== undefined) hostData.description = params.description

  await rpc(config, 'host.update', hostData)
}

export async function deleteHost(config: ZabbixConfig, hostId: string): Promise<void> {
  await rpc(config, 'host.delete', [hostId])
}

export async function enableHost(config: ZabbixConfig, hostId: string): Promise<void> {
  await rpc(config, 'host.update', { hostid: hostId, status: 0 })
}

export async function disableHost(config: ZabbixConfig, hostId: string): Promise<void> {
  await rpc(config, 'host.update', { hostid: hostId, status: 1 })
}

export async function getHost(config: ZabbixConfig, hostId: string) {
  const results = await rpc<any[]>(config, 'host.get', {
    output: ['hostid', 'host', 'name', 'status'],
    hostids: [hostId],
    selectInterfaces: ['interfaceid', 'ip', 'port', 'type'],
  })
  return results.length > 0 ? results[0] : null
}

// ─── Sync single asset ──────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'

interface SyncResult {
  success: boolean
  hostId?: string
  error?: string
}

/**
 * Syncs a single asset to Zabbix.
 * Called when monitoring is enabled on an asset.
 * Creates or updates the Zabbix host based on the asset's monitoring config.
 */
export async function syncAssetToZabbix(assetId: string): Promise<SyncResult> {
  // Load asset + monitoring config + tenant integration
  const assetMon = await prisma.assetMonitoring.findUnique({
    where: { assetId },
    include: {
      asset: {
        include: {
          assetType: true,
          tenant: { include: { monitoringIntegration: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
        },
      },
      zone: true,
    },
  })

  if (!assetMon) return { success: false, error: 'No monitoring config found for asset' }
  if (!assetMon.monitoringEnabled) return { success: false, error: 'Monitoring not enabled' }

  const integration = assetMon.asset.tenant.monitoringIntegration
  if (!integration || !integration.enabled) return { success: false, error: 'Tenant monitoring integration not configured or disabled' }

  const config: ZabbixConfig = {
    url: integration.zabbixUrl,
    apiToken: integration.zabbixApiToken,
  }

  try {
    // Update status to SYNCING
    await prisma.assetMonitoring.update({
      where: { assetId },
      data: { status: 'SYNCING' },
    })

    // 1. Ensure host group exists for this tenant
    const groupName = integration.zabbixHostGroupName || assetMon.asset.tenant.name
    const groupId = await ensureHostGroup(config, groupName)

    // Update integration with groupId if not set
    if (!integration.zabbixHostGroupId) {
      await prisma.monitoringIntegration.update({
        where: { id: integration.id },
        data: { zabbixHostGroupId: groupId },
      })
    }

    // 2. Find the Zabbix template for this asset type
    const monTemplate = await prisma.monitoringTemplate.findUnique({
      where: { assetTypeName: assetMon.asset.assetType.name },
    })

    // Use override template if specified, otherwise use the mapping
    const templateName = assetMon.templateOverride || monTemplate?.zabbixTemplateName
    let templateIds: string[] = []
    if (templateName) {
      const tid = await findTemplate(config, templateName)
      if (tid) templateIds = [tid]
    }

    // 3. Find proxy for the zone
    let proxyId: string | undefined
    if (assetMon.zone?.zabbixProxyName) {
      const pid = await findProxy(config, assetMon.zone.zabbixProxyName)
      if (pid) proxyId = pid
    }

    // 4. Determine interface type
    const protocol = monTemplate?.protocol || 'AGENT'
    const ifaceType = protocol === 'SNMP' ? 2 : protocol === 'ICMP' ? 1 : protocol === 'JMX' ? 4 : protocol === 'SSH' ? 1 : 1

    // 5. Build description
    const asset = assetMon.asset
    const desc = [
      `Asset Tag: ${asset.assetTag}`,
      asset.brand?.name ? `Brand: ${asset.brand.name}` : null,
      asset.model?.name ? `Model: ${asset.model.name}` : null,
      asset.serialNumber ? `S/N: ${asset.serialNumber}` : null,
      `Managed by AssetManager`,
    ].filter(Boolean).join('\n')

    // 6. Create or update host
    if (assetMon.zabbixHostId) {
      // Update existing host
      await updateHost(config, assetMon.zabbixHostId, {
        visibleName: `${asset.assetTag} - ${asset.hostname || asset.description || asset.assetType.name}`,
        groupId,
        templateIds,
        proxyId,
        description: desc,
      })

      await prisma.assetMonitoring.update({
        where: { assetId },
        data: { status: 'ACTIVE', lastSyncAt: new Date(), lastError: null },
      })

      return { success: true, hostId: assetMon.zabbixHostId }
    } else {
      // Create new host
      const hostId = await createHost(config, {
        hostname: asset.assetTag,
        visibleName: `${asset.assetTag} - ${asset.hostname || asset.description || asset.assetType.name}`,
        groupId,
        templateIds,
        proxyId,
        ipAddress: asset.ipAddress || undefined,
        port: monTemplate?.defaultPort || undefined,
        interfaceType: ifaceType as 1 | 2 | 3 | 4,
        snmpCommunity: assetMon.snmpCommunity || monTemplate?.snmpCommunity || undefined,
        description: desc,
      })

      await prisma.assetMonitoring.update({
        where: { assetId },
        data: { zabbixHostId: hostId, status: 'ACTIVE', lastSyncAt: new Date(), lastError: null },
      })

      return { success: true, hostId }
    }
  } catch (err: any) {
    // Update status to ERROR
    await prisma.assetMonitoring.update({
      where: { assetId },
      data: { status: 'ERROR', lastError: err.message || 'Unknown error' },
    })
    return { success: false, error: err.message }
  }
}

/**
 * Disables monitoring for an asset in Zabbix.
 * Disables (doesn't delete) the host so historical data is preserved.
 */
export async function unsyncAssetFromZabbix(assetId: string): Promise<SyncResult> {
  const assetMon = await prisma.assetMonitoring.findUnique({
    where: { assetId },
    include: {
      asset: {
        include: {
          tenant: { include: { monitoringIntegration: true } },
        },
      },
    },
  })

  if (!assetMon?.zabbixHostId) return { success: true } // Nothing to unsync

  const integration = assetMon.asset.tenant.monitoringIntegration
  if (!integration) return { success: true }

  const config: ZabbixConfig = {
    url: integration.zabbixUrl,
    apiToken: integration.zabbixApiToken,
  }

  try {
    await disableHost(config, assetMon.zabbixHostId)
    await prisma.assetMonitoring.update({
      where: { assetId },
      data: { status: 'DISABLED', monitoringEnabled: false },
    })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}


export type AvailabilityStatus = 0 | 1 | 2

export interface HostAvailability {
  available: AvailabilityStatus
  snmpAvailable: AvailabilityStatus
  ipmiAvailable: AvailabilityStatus
  jmxAvailable: AvailabilityStatus
}

export interface ZabbixHostProblemTag {
  tag: string
  value: string
}

export interface ZabbixHostProblem {
  eventid: string
  objectid: string
  name: string
  severity: string
  clock: string
  acknowledged: string
  r_eventid: string
  tags?: ZabbixHostProblemTag[]
  hosts?: Array<{ hostid: string }>
}

export interface ZabbixHostItem {
  itemid: string
  name: string
  key_: string
  lastvalue: string
  lastclock: string
  units: string
  state: string
  status: string
  error: string
  value_type: string
}

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' | 'DISABLED'

export interface HostHealth {
  hostId: string
  hostName: string
  visibleName: string
  ip: string
  health: HealthStatus
  problemCount: number
  maxSeverity: number
  maxSeverityName: string
  lastAccess?: string
  availableStatus: number
  interfaces: Array<{ type: number; ip: string; port: string; available: number }>
}

const SEVERITY_NAMES = [
  'Not classified',
  'Information',
  'Warning',
  'Average',
  'High',
  'Disaster',
] as const

export function getSeverityName(severity: number): string {
  return SEVERITY_NAMES[severity] ?? 'Unknown'
}

export function getHealthColor(health: HealthStatus): string {
  switch (health) {
    case 'HEALTHY':
      return 'text-green-600'
    case 'WARNING':
      return 'text-yellow-600'
    case 'CRITICAL':
      return 'text-red-600'
    case 'UNKNOWN':
      return 'text-gray-400'
    case 'DISABLED':
      return 'text-gray-600'
    default:
      return 'text-gray-400'
  }
}

export async function getHostAvailability(config: ZabbixConfig, hostId: string): Promise<HostAvailability> {
  const hosts = await rpc<Array<{
    interfaces?: Array<{ type: string | number; available: string | number }>
  }>>(config, 'host.get', {
    output: ['hostid', 'host', 'name', 'status'],
    hostids: [hostId],
    selectInterfaces: 'extend',
  })

  const interfaces = hosts[0]?.interfaces ?? []
  const getAvailabilityForType = (type: number): AvailabilityStatus => {
    const matching = interfaces.filter((iface) => Number(iface.type) === type)
    if (matching.length === 0) return 0
    if (matching.some((iface) => Number(iface.available) === 2)) return 2
    if (matching.some((iface) => Number(iface.available) === 1)) return 1
    return 0
  }

  return {
    available: getAvailabilityForType(1),
    snmpAvailable: getAvailabilityForType(2),
    ipmiAvailable: getAvailabilityForType(3),
    jmxAvailable: getAvailabilityForType(4),
  }
}

export async function getHostProblems(config: ZabbixConfig, hostId: string): Promise<ZabbixHostProblem[]> {
  return await rpc<ZabbixHostProblem[]>(config, 'problem.get', {
    hostids: [hostId],
    recent: true,
    output: ['eventid', 'objectid', 'name', 'severity', 'clock', 'acknowledged', 'r_eventid'],
    selectTags: 'extend',
    sortfield: 'eventid',
    sortorder: 'DESC',
  })
}

export async function getHostItems(config: ZabbixConfig, hostId: string): Promise<ZabbixHostItem[]> {
  return await rpc<ZabbixHostItem[]>(config, 'item.get', {
    hostids: [hostId],
    output: ['itemid', 'name', 'key_', 'lastvalue', 'lastclock', 'units', 'state', 'status', 'error', 'value_type'],
    filter: { status: 0 },
    sortfield: 'name',
    limit: 500,
  })
}

export async function getHostDetail(config: ZabbixConfig, hostId: string): Promise<any | null> {
  const hosts = await rpc<any[]>(config, 'host.get', {
    output: 'extend',
    hostids: [hostId],
    selectInterfaces: 'extend',
    selectParentTemplates: ['templateid', 'name'],
    selectGroups: ['groupid', 'name'],
    selectInventory: 'extend',
    selectTags: 'extend',
  })

  return hosts.length > 0 ? hosts[0] : null
}

export async function getHostsHealthBatch(config: ZabbixConfig, hostIds: string[]): Promise<HostHealth[]> {
  if (hostIds.length === 0) return []

  const [hosts, problems] = await Promise.all([
    rpc<Array<{
      hostid: string
      host: string
      name: string
      status: string | number
      interfaces?: Array<{
        interfaceid: string
        type: string | number
        ip: string
        port: string
        available: string | number
      }>
    }>>(config, 'host.get', {
      hostids: hostIds,
      output: ['hostid', 'host', 'name', 'status'],
      selectInterfaces: ['interfaceid', 'type', 'ip', 'port', 'available'],
    }),
    rpc<ZabbixHostProblem[]>(config, 'problem.get', {
      hostids: hostIds,
      recent: true,
      output: ['eventid', 'objectid', 'name', 'severity'],
      selectHosts: ['hostid'],
      sortfield: ['severity'],
      sortorder: ['DESC'],
    }),
  ])

  const problemsByHost = new Map<string, ZabbixHostProblem[]>()
  for (const problem of problems) {
    const linkedHosts = problem.hosts ?? []
    for (const linkedHost of linkedHosts) {
      const list = problemsByHost.get(linkedHost.hostid) ?? []
      list.push(problem)
      problemsByHost.set(linkedHost.hostid, list)
    }
  }

  return hosts.map((host) => {
    const interfaces = (host.interfaces ?? []).map((iface) => ({
      type: Number(iface.type),
      ip: iface.ip,
      port: iface.port,
      available: Number(iface.available),
    }))

    const availableValues = interfaces.map((iface) => iface.available)
    const availableStatus = interfaces.length === 0
      ? 0
      : availableValues.some((value) => value === 2)
        ? 2
        : availableValues.some((value) => value === 1)
          ? 1
          : 0

    const hostProblems = problemsByHost.get(host.hostid) ?? []
    const severities = hostProblems.map((problem) => Number(problem.severity))
    const maxSeverity = severities.length > 0 ? Math.max(...severities) : 0

    let health: HealthStatus
    if (Number(host.status) === 1) {
      health = 'DISABLED'
    } else if (interfaces.length === 0 || interfaces.every((iface) => iface.available === 0)) {
      health = 'UNKNOWN'
    } else if (interfaces.some((iface) => iface.available === 2)) {
      health = 'CRITICAL'
    } else if (maxSeverity >= 4) {
      health = 'CRITICAL'
    } else if (maxSeverity >= 2) {
      health = 'WARNING'
    } else {
      health = 'HEALTHY'
    }

    const primaryInterface = interfaces.find((iface) => iface.ip && iface.ip !== '0.0.0.0') ?? interfaces[0]

    return {
      hostId: host.hostid,
      hostName: host.host,
      visibleName: host.name,
      ip: primaryInterface?.ip ?? '',
      health,
      problemCount: hostProblems.length,
      maxSeverity,
      maxSeverityName: getSeverityName(maxSeverity),
      availableStatus,
      interfaces,
    }
  })
}
