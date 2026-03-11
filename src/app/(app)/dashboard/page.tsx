import { auth } from '@/lib/auth'
import { getDashboardStats, getDashboardChartData } from '@/lib/actions/dashboard'
import { getTenantsForAdmins } from '@/lib/actions/tenants'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const session = await auth()
  const role = session?.user.role ?? ''

  const tenantId = role === 'CLIENT_ADMIN'
    ? session?.user.tenantId
    : session?.user.activeTenantId

  const [data, chartData, tenants] = await Promise.all([
    getDashboardStats(tenantId),
    getDashboardChartData(tenantId ?? null),
    (role === 'SUPER_ADMIN' || role === 'INTERNAL_ADMIN')
      ? getTenantsForAdmins()
      : Promise.resolve([]),
  ])

  return (
    <DashboardClient
      data={data}
      chartData={chartData}
      currentRole={role}
      initialTenantId={tenantId ?? null}
      tenants={tenants.map(t => ({ id: t.id, name: t.name }))}
    />
  )
}
