import Link from 'next/link'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'

export default async function MonitoringDashboardsPage() {
  const session = await auth()
  const role = session?.user.role ?? ''

  if (!['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(role)) redirect('/dashboard')

  const dashboardUrl = '/grafana/d/dfht2v3g7mscga/monitoreo-general?orgId=1&kiosk&theme=light&refresh=30s'

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>Dashboards de Monitoreo</h1>
          <p className='mt-1 text-muted-foreground'>Gráficos en tiempo real de los activos monitoreados</p>
        </div>
        <Link
          href='/admin/monitoring'
          className='inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent'
        >
          ← Volver a Monitoreo
        </Link>
      </div>

      <div className='overflow-hidden rounded-lg border bg-card' style={{ height: 'calc(100vh - 180px)' }}>
        <iframe src={dashboardUrl} className='h-full w-full border-0' title='Monitoring Dashboard' />
      </div>
    </div>
  )
}
