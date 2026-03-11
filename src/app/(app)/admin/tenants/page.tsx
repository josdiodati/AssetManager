import { getTenants } from '@/lib/actions/tenants'
import { TenantsClient } from './tenants-client'

export default async function TenantsPage() {
  const tenants = await getTenants()
  return <TenantsClient tenants={tenants} />
}
