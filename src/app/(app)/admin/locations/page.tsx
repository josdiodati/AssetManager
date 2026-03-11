import { auth } from '@/lib/auth'
import { getLocations } from '@/lib/actions/locations'
import { getTenantsForAdmins } from '@/lib/actions/tenants'
import { LocationsClient } from './locations-client'

export default async function LocationsPage() {
  const session = await auth()
  const role = session?.user.role ?? ''
  const isSuperOrInternal = role === 'SUPER_ADMIN' || role === 'INTERNAL_ADMIN'

  const tenantId = isSuperOrInternal
    ? (session?.user.activeTenantId ?? null)
    : (session?.user.tenantId ?? null)

  const [locations, tenants] = await Promise.all([
    getLocations(tenantId),
    isSuperOrInternal ? getTenantsForAdmins() : Promise.resolve([]),
  ])

  return (
    <LocationsClient
      locations={locations}
      tenants={tenants}
      defaultTenantId={tenantId ?? ''}
      currentRole={role}
    />
  )
}
