import { auth } from '@/lib/auth'
import { getDashboardStats } from '@/lib/actions/dashboard'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const session = await auth()
  const tenantId = session?.user.role === 'CLIENT_ADMIN'
    ? session.user.tenantId
    : session?.user.activeTenantId

  const data = await getDashboardStats(tenantId)

  return <DashboardClient data={data} currentRole={session?.user.role ?? ''} />
}
