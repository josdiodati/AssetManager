import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMonitoringZones } from '@/lib/actions/monitoring'
import { getTenantsForAdmins } from '@/lib/actions/tenants'
import { MonitoringZonesClient } from './zones-client'

export default async function MonitoringZonesPage() {
  const session = await auth()
  const role = session?.user.role ?? ''
  if (!['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(role)) redirect('/dashboard')

  const tenantId = session?.user.activeTenantId ?? ''
  const tenants = role === 'SUPER_ADMIN' ? await getTenantsForAdmins() : []
  const zones = tenantId ? await getMonitoringZones(tenantId) : []

  return (
    <MonitoringZonesClient
      zones={zones}
      tenants={tenants}
      defaultTenantId={tenantId}
      currentRole={role}
    />
  )
}
