import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMonitoringOverview } from '@/lib/actions/monitoring-overview'
import { MonitoringTable } from './monitoring-table'

export default async function MonitoringPage() {
  const session = await auth()
  const role = session?.user.role ?? ''
  if (!['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(role)) redirect('/dashboard')

  const overview = await getMonitoringOverview()

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>Monitoreo</h1>
          <p className='mt-1 text-muted-foreground'>Estado operativo de todos los activos monitoreados y monitoreadores</p>
        </div>
        <div className='flex gap-2'>
          <a href='/admin/monitoring/dashboards' className='inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent'>📊 Dashboards</a>
          <a href='/admin/config?tab=monitoring' className='inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent'>Configuración YAML</a>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
        <div className='rounded-lg border bg-card p-4'>
          <div className='text-sm text-muted-foreground'>Total</div>
          <div className='text-2xl font-bold'>{overview.stats.total}</div>
        </div>
        <div className='rounded-lg border bg-card p-4'>
          <div className='text-sm text-muted-foreground'>🟢 Healthy</div>
          <div className='text-2xl font-bold text-green-600'>{overview.stats.healthy}</div>
        </div>
        <div className='rounded-lg border bg-card p-4'>
          <div className='text-sm text-muted-foreground'>🟡 Warning</div>
          <div className='text-2xl font-bold text-yellow-600'>{overview.stats.warning}</div>
        </div>
        <div className='rounded-lg border bg-card p-4'>
          <div className='text-sm text-muted-foreground'>🔴 Critical</div>
          <div className='text-2xl font-bold text-red-600'>{overview.stats.critical}</div>
        </div>
        <div className='rounded-lg border bg-card p-4'>
          <div className='text-sm text-muted-foreground'>⚪ Unknown</div>
          <div className='text-2xl font-bold text-gray-500'>{overview.stats.unknown}</div>
        </div>
      </div>

      <div className='rounded-lg border bg-card p-4 space-y-3'>
        <h2 className='font-semibold'>Monitoreadores declarados</h2>
        {overview.probes.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No hay monitoreadores configurados.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b'>
                  <th className='text-left py-2 font-medium'>Nombre</th>
                  <th className='text-left py-2 font-medium'>Cliente</th>
                  <th className='text-left py-2 font-medium'>Ubicación</th>
                  <th className='text-left py-2 font-medium'>Proxy</th>
                  <th className='text-left py-2 font-medium'>WireGuard</th>
                </tr>
              </thead>
              <tbody>
                {overview.probes.map((p: any) => (
                  <tr key={p.id} className='border-b last:border-0'>
                    <td className='py-2'>{p.name}</td>
                    <td className='py-2'>{p.integration?.tenant?.name || '—'}</td>
                    <td className='py-2'>{p.location ? `${p.location.site}${p.location.area ? ` / ${p.location.area}` : ''}` : '—'}</td>
                    <td className='py-2'>{p.zabbixProxyName || '—'}</td>
                    <td className='py-2'>{p.wireguardEndpoint || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className='rounded-lg border bg-card p-4 space-y-3'>
        <h2 className='font-semibold'>Activos monitoreados</h2>
        <MonitoringTable monitoredAssets={overview.monitoredAssets as any} />
      </div>
    </div>
  )
}
