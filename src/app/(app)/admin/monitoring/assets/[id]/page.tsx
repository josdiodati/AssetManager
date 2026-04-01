import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getHostDetail,
  getHostProblems,
  getHostItems,
  type ZabbixHostProblem,
  type ZabbixHostItem,
} from '@/lib/zabbix-client'
import { getSeverityName, getSeverityBadgeClass } from '@/lib/monitoring-utils'
import { ItemsTable } from './items-table'

type PageProps = {
  params: Promise<{ id: string }>
}

function formatDateTime(value?: Date | string | number | null) {
  if (!value) return '—'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)
}

function formatUnixDateTime(value?: string | null) {
  if (!value) return '—'
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '—'
  return formatDateTime(timestamp * 1000)
}

function formatRelativeDate(value?: Date | string | number | null) {
  if (!value) return '—'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (diffSeconds < 60) return 'hace unos segundos'
  if (diffSeconds < 3600) return `hace ${Math.floor(diffSeconds / 60)} min`
  if (diffSeconds < 86400) return `hace ${Math.floor(diffSeconds / 3600)} h`
  if (diffSeconds < 604800) return `hace ${Math.floor(diffSeconds / 86400)} d`

  return formatDateTime(date)
}

function getInterfaceTypeLabel(type?: string | number | null) {
  switch (Number(type)) {
    case 1:
      return 'Agent'
    case 2:
      return 'SNMP'
    case 3:
      return 'IPMI'
    case 4:
      return 'JMX'
    default:
      return '—'
  }
}

function getAvailabilityMeta(available?: string | number | null) {
  switch (Number(available)) {
    case 1:
      return { label: 'Available', className: 'bg-green-100 text-green-800' }
    case 2:
      return { label: 'Unavailable', className: 'bg-red-100 text-red-800' }
    default:
      return { label: 'Unknown', className: 'bg-gray-100 text-gray-700' }
  }
}

function getHostStatusLabel(status?: string | number | null) {
  return Number(status) === 1 ? 'Disabled' : 'Enabled'
}



function formatUptime(rawValue?: string | null) {
  if (!rawValue) return '—'
  const totalSeconds = Number(rawValue)
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return rawValue

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes || parts.length === 0) parts.push(`${minutes}m`)
  return parts.join(' ')
}

function SummaryField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className='space-y-1'>
      <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>{label}</div>
      <div className='text-sm break-words'>{value || '—'}</div>
    </div>
  )
}

export default async function MonitoringAssetDetailPage({ params }: PageProps) {
  const session = await auth()
  const role = session?.user.role ?? ''
  if (!['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(role)) redirect('/dashboard')

  const { id } = await params

  const monitoring = await prisma.assetMonitoring.findUnique({
    where: { id },
    include: {
      asset: {
        include: {
          assetType: true,
          tenant: {
            include: {
              monitoringIntegration: true,
            },
          },
        },
      },
      zone: true,
    },
  })

  if (!monitoring) redirect('/admin/monitoring')

  const integration = monitoring.asset.tenant.monitoringIntegration
  const hasHost = Boolean(monitoring.zabbixHostId)

  let hostDetail: any | null = null
  let problems: ZabbixHostProblem[] = []
  let items: ZabbixHostItem[] = []
  let zabbixError: string | null = null

  if (hasHost && !integration) {
    zabbixError = 'El tenant no tiene una integración de monitoreo configurada.'
  } else if (hasHost && integration && !integration.enabled) {
    zabbixError = 'La integración de monitoreo del tenant no está habilitada.'
  } else if (hasHost && integration && monitoring.zabbixHostId) {
    try {
      const config = {
        url: integration.zabbixUrl,
        apiToken: integration.zabbixApiToken,
      }

      ;[hostDetail, problems, items] = await Promise.all([
        getHostDetail(config, monitoring.zabbixHostId),
        getHostProblems(config, monitoring.zabbixHostId),
        getHostItems(config, monitoring.zabbixHostId),
      ])
    } catch (error: any) {
      zabbixError = error?.message || 'No se pudo consultar Zabbix en este momento.'
    }
  }

  const firstInterface = hostDetail?.interfaces?.[0]
  const uptimeItem = items.find((item) => item.key_ === 'system.uptime' || item.key_ === 'system.net.uptime')
  const title = `${monitoring.asset.assetTag} — ${monitoring.asset.description || monitoring.asset.hostname || monitoring.asset.assetType.name}`
  const subtitle = `${monitoring.asset.assetType.name} · ${monitoring.asset.tenant.name}`
  const proxyValue = monitoring.zone?.zabbixProxyName || monitoring.zone?.name || hostDetail?.proxy_address || hostDetail?.assigned_proxyid || '—'
  const availability = getAvailabilityMeta(firstInterface?.available)

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Link href='/admin/monitoring' className='inline-flex text-sm text-muted-foreground hover:underline'>
          ← Volver a Monitoreo
        </Link>
        <div>
          <h1 className='text-2xl font-bold'>{title}</h1>
          <p className='mt-1 text-muted-foreground'>{subtitle}</p>
        </div>
      </div>

      {zabbixError && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800'>
          <div className='font-semibold'>Error consultando Zabbix</div>
          <div className='mt-1'>{zabbixError}</div>
        </div>
      )}

      {!monitoring.zabbixHostId && (
        <div className='rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900'>
          Este activo aún no está sincronizado con Zabbix.
        </div>
      )}

      <section className='rounded-lg border bg-card p-4 space-y-3'>
        <h2 className='font-semibold'>Resumen del Host</h2>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <SummaryField label='Host ID' value={monitoring.zabbixHostId || '—'} />
          <SummaryField label='Nombre técnico' value={hostDetail?.host || monitoring.monitoringHostname || monitoring.asset.hostname || '—'} />
          <SummaryField label='Nombre visible' value={hostDetail?.name || monitoring.asset.description || monitoring.asset.assetTag} />
          <SummaryField label='Estado' value={hostDetail ? getHostStatusLabel(hostDetail.status) : monitoring.status} />
          <SummaryField label='Proxy' value={proxyValue} />
          <SummaryField label='IP monitoreada' value={firstInterface?.ip || monitoring.monitoringIpAddress || monitoring.asset.ipAddress || '—'} />
          <SummaryField label='Puerto' value={firstInterface?.port || '—'} />
          <SummaryField label='Tipo interfaz' value={getInterfaceTypeLabel(firstInterface?.type)} />
          <SummaryField
            label='Disponibilidad'
            value={<span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${availability.className}`}>{availability.label}</span>}
          />
          <SummaryField
            label='Templates'
            value={hostDetail?.parentTemplates?.length ? (
              <div className='flex flex-wrap gap-2'>
                {hostDetail.parentTemplates.map((template: { templateid: string; name: string }) => (
                  <span key={template.templateid} className='inline-flex rounded bg-muted px-2 py-1 text-xs'>
                    {template.name}
                  </span>
                ))}
              </div>
            ) : '—'}
          />
          <SummaryField
            label='Grupos'
            value={hostDetail?.groups?.length ? (
              <div className='flex flex-wrap gap-2'>
                {hostDetail.groups.map((group: { groupid: string; name: string }) => (
                  <span key={group.groupid} className='inline-flex rounded bg-muted px-2 py-1 text-xs'>
                    {group.name}
                  </span>
                ))}
              </div>
            ) : '—'}
          />
          <SummaryField label='Uptime' value={formatUptime(uptimeItem?.lastvalue)} />
          <SummaryField
            label='Último sync AM'
            value={
              <div>
                <div>{formatDateTime(monitoring.lastSyncAt)}</div>
                <div className='text-xs text-muted-foreground'>{formatRelativeDate(monitoring.lastSyncAt)}</div>
              </div>
            }
          />
        </div>
      </section>

      <section className='rounded-lg border bg-card p-4 space-y-3'>
        <h2 className='font-semibold'>Problemas Activos</h2>
        {problems.length === 0 ? (
          <p className='text-sm font-medium text-green-700'>Sin problemas activos ✅</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b'>
                  <th className='py-2 text-left'>Severidad</th>
                  <th className='py-2 text-left'>Problema</th>
                  <th className='py-2 text-left'>Desde</th>
                  <th className='py-2 text-left'>Reconocido</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => {
                  const severity = Number(problem.severity)
                  return (
                    <tr key={problem.eventid} className='border-b last:border-0'>
                      <td className='py-2'>
                        <span className={`inline-flex rounded px-2 py-1 text-xs ${getSeverityBadgeClass(severity)}`}>
                          {getSeverityName(severity)}
                        </span>
                      </td>
                      <td className='py-2'>{problem.name}</td>
                      <td className='py-2'>{formatUnixDateTime(problem.clock)}</td>
                      <td className='py-2'>{problem.acknowledged === '1' ? '✅' : '❌'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className='rounded-lg border bg-card p-4 space-y-3'>
        <div>
          <h2 className='font-semibold'>Items (Datos Raw)</h2>
          <p className='text-sm text-muted-foreground'>Valores directos reportados por Zabbix para este host.</p>
        </div>
        <ItemsTable items={items} />
      </section>

      <section className='rounded-lg border bg-card p-4 space-y-3'>
        <h2 className='font-semibold'>JSON Raw</h2>

        <details className='rounded-md border p-3'>
          <summary className='cursor-pointer text-sm font-medium'>Host completo</summary>
          <pre className='mt-3 max-h-96 overflow-auto rounded bg-muted p-4 text-xs font-mono'>{JSON.stringify(hostDetail, null, 2)}</pre>
        </details>

        <details className='rounded-md border p-3'>
          <summary className='cursor-pointer text-sm font-medium'>Items completo</summary>
          <pre className='mt-3 max-h-96 overflow-auto rounded bg-muted p-4 text-xs font-mono'>{JSON.stringify(items, null, 2)}</pre>
        </details>

        <details className='rounded-md border p-3'>
          <summary className='cursor-pointer text-sm font-medium'>Problemas completo</summary>
          <pre className='mt-3 max-h-96 overflow-auto rounded bg-muted p-4 text-xs font-mono'>{JSON.stringify(problems, null, 2)}</pre>
        </details>
      </section>
    </div>
  )
}
