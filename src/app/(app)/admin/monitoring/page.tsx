import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMonitoringIntegration } from '@/lib/actions/monitoring'
import { getTenantsForAdmins } from '@/lib/actions/tenants'
import { MonitoringConfigClient } from './monitoring-config-client'

export default async function MonitoringConfigPage() {
  const session = await auth()
  const role = session?.user.role ?? ''
  if (!['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(role)) redirect('/dashboard')

  const tenantId = session?.user.activeTenantId ?? ''
  const tenants = role === 'SUPER_ADMIN' ? await getTenantsForAdmins() : []
  const integration = tenantId ? await getMonitoringIntegration(tenantId) : null

  return (
    <MonitoringConfigClient
      integration={integration}
      tenants={tenants}
      defaultTenantId={tenantId}
      currentRole={role}
    />
  )
}
