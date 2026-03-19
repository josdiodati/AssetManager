'use server'

/**
 * Grafana HTTP API Client
 * Manages orgs, datasources, and dashboards per tenant.
 */

interface GrafanaConfig {
  url: string     // e.g. http://localhost:3001
  adminUser: string
  adminPass: string
}

const defaultConfig: GrafanaConfig = {
  url: process.env.GRAFANA_URL || 'http://localhost:3001',
  adminUser: process.env.GRAFANA_ADMIN_USER || 'admin',
  adminPass: process.env.GRAFANA_ADMIN_PASS || 'grafana_admin_2026',
}

async function gfApi<T = any>(method: string, path: string, body?: any, orgId?: number): Promise<T> {
  const config = defaultConfig
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${config.adminUser}:${config.adminPass}`).toString('base64'),
  }
  if (orgId) headers['X-Grafana-Org-Id'] = orgId.toString()

  const res = await fetch(`${config.url}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const text = await res.text()
  try { return JSON.parse(text) } catch { return text as any }
}

// ─── Org management ──────────────────────────────────────────────────────────

export async function createOrg(tenantName: string): Promise<number> {
  // Check if org already exists
  const orgs = await gfApi<{ id: number; name: string }[]>('GET', '/api/orgs')
  const existing = orgs.find(o => o.name === tenantName)
  if (existing) return existing.id

  const result = await gfApi<{ orgId: number }>('POST', '/api/orgs', { name: tenantName })
  return result.orgId
}

export async function deleteOrg(orgId: number): Promise<void> {
  await gfApi('DELETE', `/api/orgs/${orgId}`)
}

// ─── Datasource per org ──────────────────────────────────────────────────────

export async function createZabbixDatasource(orgId: number, zabbixUrl: string, zabbixUser: string, zabbixPass: string): Promise<number> {
  // Check if datasource exists in this org
  const existing = await gfApi<{ id: number; name: string }[]>('GET', '/api/datasources', undefined, orgId)
  const ds = Array.isArray(existing) ? existing.find(d => d.name === 'Zabbix') : null
  if (ds) return ds.id

  const result = await gfApi<{ datasource: { id: number } }>('POST', '/api/datasources', {
    name: 'Zabbix',
    type: 'alexanderzobnin-zabbix-datasource',
    access: 'proxy',
    url: zabbixUrl,
    jsonData: {
      username: zabbixUser,
      trends: true,
      trendsFrom: '7d',
      trendsRange: '4d',
      cacheTTL: '1h',
    },
    secureJsonData: { password: zabbixPass },
    isDefault: true,
  }, orgId)

  return result.datasource.id
}

// ─── Dashboard provisioning ──────────────────────────────────────────────────

export async function createOverviewDashboard(orgId: number, hostGroupName: string): Promise<string> {
  const dashboard = {
    dashboard: {
      title: 'Infrastructure Overview',
      tags: ['zabbix', 'auto-provisioned'],
      timezone: 'browser',
      panels: [
        {
          id: 1,
          title: 'Hosts — Status',
          type: 'stat',
          gridPos: { h: 4, w: 6, x: 0, y: 0 },
          datasource: { type: 'alexanderzobnin-zabbix-datasource', uid: '' },
          targets: [{
            group: { filter: hostGroupName },
            host: { filter: '/.*/' },
            application: { filter: '' },
            item: { filter: 'Agent ping' },
            functions: [],
            mode: 0,
          }],
        },
        {
          id: 2,
          title: 'Problems',
          type: 'table',
          gridPos: { h: 8, w: 24, x: 0, y: 4 },
          datasource: { type: 'alexanderzobnin-zabbix-datasource', uid: '' },
          targets: [{
            group: { filter: hostGroupName },
            host: { filter: '/.*/' },
            application: { filter: '' },
            trigger: { filter: '/.*/' },
            mode: 5,  // Problems mode
          }],
        },
        {
          id: 3,
          title: 'CPU Usage (Top Hosts)',
          type: 'timeseries',
          gridPos: { h: 8, w: 12, x: 0, y: 12 },
          datasource: { type: 'alexanderzobnin-zabbix-datasource', uid: '' },
          targets: [{
            group: { filter: hostGroupName },
            host: { filter: '/.*/' },
            item: { filter: '/CPU utilization|system.cpu.util/' },
            mode: 0,
          }],
        },
        {
          id: 4,
          title: 'Memory Usage (Top Hosts)',
          type: 'timeseries',
          gridPos: { h: 8, w: 12, x: 12, y: 12 },
          datasource: { type: 'alexanderzobnin-zabbix-datasource', uid: '' },
          targets: [{
            group: { filter: hostGroupName },
            host: { filter: '/.*/' },
            item: { filter: '/Memory utilization|vm.memory.utilization/' },
            mode: 0,
          }],
        },
      ],
      schemaVersion: 39,
    },
    overwrite: true,
  }

  const result = await gfApi<{ uid: string }>('POST', '/api/dashboards/db', dashboard, orgId)
  return result.uid
}

// ─── Full tenant provisioning ────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'

export async function provisionGrafanaForTenant(tenantId: string): Promise<{ orgId: number; dashboardUid: string }> {
  const integration = await prisma.monitoringIntegration.findFirst({
    where: { tenantId },
    include: { tenant: true },
  })

  if (!integration) throw new Error('No monitoring integration for tenant')

  const tenantName = integration.tenant.name
  const hostGroupName = integration.zabbixHostGroupName || tenantName

  // 1. Create Grafana org
  const orgId = await createOrg(tenantName)

  // 2. Create Zabbix datasource in that org
  // Use the internal Docker network URL for Zabbix
  await createZabbixDatasource(
    orgId,
    'http://zabbix-web:8080/api_jsonrpc.php',
    'Admin',
    'zabbix'  // TODO: use per-tenant Zabbix user when implemented
  )

  // 3. Create overview dashboard
  const dashboardUid = await createOverviewDashboard(orgId, hostGroupName)

  // 4. Save org ID and dashboard UID to integration
  await prisma.monitoringIntegration.update({
    where: { id: integration.id },
    data: {
      grafanaOrgId: orgId,
      grafanaDashboardUid: dashboardUid,
    },
  })

  return { orgId, dashboardUid }
}
