import { auth } from '@/lib/auth'
import { getPersons } from '@/lib/actions/persons'
import { getLocations } from '@/lib/actions/locations'
import { getTenants } from '@/lib/actions/tenants'
import { PersonsClient } from './persons-client'

export default async function PersonsPage() {
  const session = await auth()
  const tenantId = session?.user.role === 'CLIENT_ADMIN'
    ? session.user.tenantId
    : session?.user.activeTenantId

  // SUPER_ADMIN with no active tenant sees all persons
  const persons = await getPersons(tenantId ?? null)
  const locations = tenantId ? await getLocations(tenantId) : []
  const tenants = session?.user.role === 'SUPER_ADMIN' ? await getTenants() : []

  return (
    <PersonsClient
      persons={persons}
      locations={locations}
      tenantId={tenantId ?? ''}
      currentRole={session?.user.role ?? ''}
      tenants={tenants}
      showTenantColumn={session?.user.role === 'SUPER_ADMIN'}
    />
  )
}
