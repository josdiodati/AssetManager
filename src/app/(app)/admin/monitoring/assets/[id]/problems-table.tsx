'use client'

import { useState, useTransition } from 'react'
import type { ZabbixHostProblem } from '@/lib/zabbix-client'
import { getSeverityName, getSeverityBadgeClass } from '@/lib/monitoring-utils'
import { acknowledgeProblems } from '@/lib/actions/monitoring'

function formatUnixDateTime(value?: string | null) {
  if (!value) return '—'
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(timestamp * 1000))
}

type Props = {
  problems: ZabbixHostProblem[]
  monitoringId: string
}

export function ProblemsTable({ problems, monitoringId }: Props) {
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set())

  const unackedCount = problems.filter((p) => p.acknowledged !== '1').length
  const ackedCount = problems.filter((p) => p.acknowledged === '1').length
  const displayedProblems = showAcknowledged ? problems : problems.filter((p) => p.acknowledged !== '1')

  function handleAcknowledge(eventId: string) {
    setAcknowledging((prev) => new Set(prev).add(eventId))
    startTransition(async () => {
      try {
        await acknowledgeProblems(monitoringId, [eventId])
      } catch (err) {
        console.error('Failed to acknowledge:', err)
      } finally {
        setAcknowledging((prev) => {
          const next = new Set(prev)
          next.delete(eventId)
          return next
        })
      }
    })
  }

  function handleAcknowledgeAll() {
    const unackedIds = problems.filter((p) => p.acknowledged !== '1').map((p) => p.eventid)
    if (unackedIds.length === 0) return
    for (const id of unackedIds) {
      setAcknowledging((prev) => new Set(prev).add(id))
    }
    startTransition(async () => {
      try {
        await acknowledgeProblems(monitoringId, unackedIds)
      } catch (err) {
        console.error('Failed to acknowledge all:', err)
      } finally {
        setAcknowledging(new Set())
      }
    })
  }

  return (
    <section className='rounded-lg border bg-card p-4 space-y-3'>
      <div className='flex items-center justify-between gap-3 flex-wrap'>
        <h2 className='font-semibold'>Problemas Activos</h2>
        <div className='flex items-center gap-3'>
          {unackedCount > 0 && (
            <button
              type='button'
              onClick={handleAcknowledgeAll}
              disabled={isPending}
              className='inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50'
            >
              {isPending ? 'Procesando...' : `Reconocer todos (${unackedCount})`}
            </button>
          )}
          {ackedCount > 0 && (
            <label className='flex items-center gap-2 text-sm text-muted-foreground cursor-pointer'>
              <input
                type='checkbox'
                checked={showAcknowledged}
                onChange={(e) => setShowAcknowledged(e.target.checked)}
                className='rounded'
              />
              Mostrar reconocidos ({ackedCount})
            </label>
          )}
        </div>
      </div>

      {displayedProblems.length === 0 ? (
        <p className='text-sm font-medium text-green-700'>
          {problems.length === 0 ? 'Sin problemas activos ✅' : 'Todos los problemas están reconocidos ✅'}
        </p>
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
              {displayedProblems.map((problem) => {
                const severity = Number(problem.severity)
                const isAcked = problem.acknowledged === '1'
                const isProcessing = acknowledging.has(problem.eventid)

                return (
                  <tr key={problem.eventid} className='border-b last:border-0'>
                    <td className='py-2'>
                      <span className={`inline-flex rounded px-2 py-1 text-xs ${getSeverityBadgeClass(severity)}`}>
                        {getSeverityName(severity)}
                      </span>
                    </td>
                    <td className='py-2'>{problem.name}</td>
                    <td className='py-2'>{formatUnixDateTime(problem.clock)}</td>
                    <td className='py-2'>
                      {isAcked ? (
                        <span title='Reconocido'>✅</span>
                      ) : (
                        <button
                          type='button'
                          onClick={() => handleAcknowledge(problem.eventid)}
                          disabled={isProcessing || isPending}
                          className='hover:bg-muted rounded px-1 py-0.5 transition-colors disabled:opacity-50'
                          title='Click para reconocer este problema'
                        >
                          {isProcessing ? '⏳' : '❌'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
