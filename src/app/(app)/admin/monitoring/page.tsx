import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMonitoringOverview } from '@/lib/actions/monitoring-overview'

function statusBadgeClass(status: string) {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800'
    case 'PENDING': return 'bg-yellow-100 text-yellow-800'
    case 'ERROR': return 'bg-red-100 text-red-800'
    case 'SYNCING': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

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
          <p className='text-muted-foreground mt-1'>Estado operativo de todos los activos monitoreados y monitoreadores</p>
        </div>
        <a href='/admin/config?tab=monitoring' className='inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent'>Configuración YAML</a>
      </div>

      {overview.stats && (
        <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
          <div className='rounded-lg border bg-card p-4'><div className='text-sm text-muted-foreground'>Total</div><div className='text-2xl font-bold'>{overview.stats.total}</div></div>
          <div className='rounded-lg border bg-card p-4'><div className='text-sm text-muted-foreground'>Activos</div><div className='text-2xl font-bold text-green-600'>{overview.stats.active}</div></div>
          <div className='rounded-lg border bg-card p-4'><div className='text-sm text-muted-foreground'>Pendientes</div><div className='text-2xl font-bold text-yellow-600'>{overview.stats.pending}</div></div>
          <div className='rounded-lg border bg-card p-4'><div className='text-sm text-muted-foreground'>Con error</div><div className='text-2xl font-bold text-red-600'>{overview.stats.error}</div></div>
          <div className='rounded-lg border bg-card p-4'><div className='text-sm text-muted-foreground'>Deshabilitados</div><div className='text-2xl font-bold text-gray-600'>{overview.stats.disabled}</div></div>
        </div>
      )}

      <div className='rounded-lg border bg-card p-4 space-y-3'>
        <h2 className='font-semibold'>Monitoreadores declarados</h2>
        {overview.probes.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No hay monitoreadores configurados.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b'>
                  <th className='text-left py-2'>Nombre</th>
                  <th className='text-left py-2'>Cliente</th>
                  <th className='text-left py-2'>Ubicación</th>
                  <th className='text-left py-2'>Proxy</th>
                  <th className='text-left py-2'>WireGuard</th>
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
        {overview.monitoredAssets.length === 0 ? (
          <p className='text-sm text-muted-foreground'>Todavía no hay activos con monitoreo configurado.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b'>
                  <th className='text-left py-2'>Activo</th>
                  <th className='text-left py-2'>Cliente</th>
                  <th className='text-left py-2'>IP Monitoreo</th>
                  <th className='text-left py-2'>Monitoreador</th>
                  <th className='text-left py-2'>Estado</th>
                  <th className='text-left py-2'>Zabbix Host ID</th>
                </tr>
              </thead>
              <tbody>
                {overview.monitoredAssets.map((m: any) => (
                  <tr key={m.id} className='border-b last:border-0'>
                    <td className='py-2'>
                      <a href={`/assets/${m.asset.id}`} className='font-medium hover:underline'>{m.asset.assetTag}</a>
                      <div className='text-muted-foreground text-xs'>{m.asset.description || m.asset.hostname || '—'}</div>
                    </td>
                    <td className='py-2'>{m.asset.tenant?.name || '—'}</td>
                    <td className='py-2'>{m.monitoringIpAddress || m.asset.ipAddress || '—'}</td>
                    <td className='py-2'>{m.zone?.name || '—'}</td>
                    <td className='py-2'><span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusBadgeClass(m.status)}`}>{m.status}</span></td>
                    <td className='py-2'>{m.zabbixHostId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
