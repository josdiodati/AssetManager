import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMonitoringZones } from '@/lib/actions/monitoring'
import { getLocations } from '@/lib/actions/locations'
import { getTenantsForAdmins } from '@/lib/actions/tenants'
import { MonitoringZonesClient } from './zones-client'

export default async function MonitoringZonesPage() {
  const session = await auth()
  const role = session?.user.role ?? ''
  if (!['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(role)) redirect('/dashboard')

  const tenantId = session?.user.activeTenantId ?? ''
  const [tenants, zones, locations] = await Promise.all([
    role === 'SUPER_ADMIN' ? getTenantsForAdmins() : Promise.resolve([]),
    tenantId ? getMonitoringZones(tenantId) : Promise.resolve([]),
    tenantId ? getLocations(tenantId) : Promise.resolve([]),
  ])

  return (
    <MonitoringZonesClient
      zones={zones}
      tenants={tenants}
      locations={locations}
      defaultTenantId={tenantId}
      currentRole={role}
    />
  )
}
