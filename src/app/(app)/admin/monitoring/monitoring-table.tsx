'use client'

import { useRouter } from 'next/navigation'
import type { HostHealth, HealthStatus } from '@/lib/zabbix-client'

interface MonitoringRow {
  id: string
  assetId: string
  zabbixHostId: string | null
  status: string
  monitoringEnabled: boolean
  monitoringIpAddress: string | null
  asset: {
    id: string
    assetTag: string
    description: string | null
    hostname: string | null
    ipAddress: string | null
    tenant: { name: string } | null
    assetType: { name: string } | null
  }
  zone: { name: string } | null
  health: HostHealth | null
}

function HealthBadge({ health }: { health: HealthStatus | null }) {
  const config: Record<HealthStatus, { dot: string; label: string; className: string }> = {
    HEALTHY: { dot: '🟢', label: 'Healthy', className: 'text-green-600' },
    WARNING: { dot: '🟡', label: 'Warning', className: 'text-yellow-600' },
    CRITICAL: { dot: '🔴', label: 'Critical', className: 'text-red-600' },
    UNKNOWN: { dot: '⚪', label: 'Unknown', className: 'text-gray-400' },
    DISABLED: { dot: '⚫', label: 'Disabled', className: 'text-gray-600' },
  }

  if (!health) return <span className='text-gray-400'>⚪ Unknown</span>
  const current = config[health]
  return <span className={current.className}>{current.dot} {current.label}</span>
}

function severityClass(severity?: string | null) {
  switch (severity) {
    case 'Warning':
      return 'text-yellow-600'
    case 'Average':
      return 'text-orange-500'
    case 'High':
      return 'text-red-500'
    case 'Disaster':
      return 'font-semibold text-red-700'
    case 'Not classified':
    case 'Information':
    default:
      return 'text-gray-500'
  }
}

function formatRelativeTime(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const diffMs = date.getTime() - Date.now()
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' },
  ]

  let duration = diffMs / 1000
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }

  return '—'
}

export function MonitoringTable({ monitoredAssets }: { monitoredAssets: MonitoringRow[] }) {
  const router = useRouter()

  if (monitoredAssets.length === 0) {
    return <p className='text-sm text-muted-foreground'>Todavía no hay activos con monitoreo configurado.</p>
  }

  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b'>
            <th className='text-left py-2 font-medium'>Activo</th>
            <th className='text-left py-2 font-medium'>Cliente</th>
            <th className='text-left py-2 font-medium'>IP</th>
            <th className='text-left py-2 font-medium'>Tipo</th>
            <th className='text-left py-2 font-medium'>Health</th>
            <th className='text-left py-2 font-medium'>Problemas</th>
            <th className='text-left py-2 font-medium'>Severidad</th>
            <th className='text-left py-2 font-medium'>Último dato</th>
          </tr>
        </thead>
        <tbody>
          {monitoredAssets.map((m) => {
            const ip = m.health?.ip || m.monitoringIpAddress || m.asset.ipAddress || '—'
            const severity = m.health?.maxSeverityName || '—'
            const problemCount = m.health?.problemCount ?? 0

            return (
              <tr
                key={m.id}
                className='cursor-pointer border-b text-sm transition-colors hover:bg-accent/50 last:border-0'
                onClick={() => router.push(`/admin/monitoring/assets/${m.id}`)}
              >
                <td className='py-2'>
                  <div className='font-medium'>{m.asset.assetTag}</div>
                  <div className='text-xs text-muted-foreground'>{m.asset.description || m.asset.hostname || '—'}</div>
                </td>
                <td className='py-2'>{m.asset.tenant?.name || '—'}</td>
                <td className='py-2'>{ip}</td>
                <td className='py-2'>{m.asset.assetType?.name || '—'}</td>
                <td className='py-2'><HealthBadge health={m.health?.health ?? null} /></td>
                <td className={`py-2 ${problemCount > 0 ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>{problemCount}</td>
                <td className={`py-2 ${severityClass(m.health?.maxSeverityName)}`}>{severity}</td>
                <td className='py-2 text-muted-foreground'>{formatRelativeTime(m.health?.lastAccess)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
