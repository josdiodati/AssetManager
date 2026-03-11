import { auth } from '@/lib/auth'
import { getLocations } from '@/lib/actions/locations'
import { getTenants } from '@/lib/actions/tenants'
import { LocationsClient } from './locations-client'

export default async function LocationsPage() {
  const session = await auth()
  const tenantId = session?.user.activeTenantId ?? session?.user.tenantId ?? ''
  const tenants = session?.user.role === 'SUPER_ADMIN' ? await getTenants() : []
  const locations = tenantId ? await getLocations(tenantId) : []
  return <LocationsClient locations={locations} tenants={tenants} defaultTenantId={tenantId} currentRole={session?.user.role ?? ''} />
}
