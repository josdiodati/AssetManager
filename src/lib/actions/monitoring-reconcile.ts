'use server'

import { prisma } from '@/lib/prisma'
import { syncAssetToZabbix, unsyncAssetFromZabbix } from '@/lib/zabbix-client'
import { revalidatePath } from 'next/cache'

/**
 * Reconciliation: syncs all PENDING or ERROR assets to Zabbix.
 * Run on-demand from admin UI or on a schedule.
 */
export async function reconcileMonitoring(tenantId: string): Promise<{
  processed: number; synced: number; errors: number; details: string[]
}> {
  const pendingAssets = await prisma.assetMonitoring.findMany({
    where: {
      monitoringEnabled: true,
      status: { in: ['PENDING', 'ERROR'] },
      asset: { tenantId },
    },
    select: { assetId: true, status: true },
  })

  const details: string[] = []
  let synced = 0
  let errors = 0

  for (const am of pendingAssets) {
    const result = await syncAssetToZabbix(am.assetId)
    if (result.success) {
      synced++
      details.push(`✅ ${am.assetId}: synced (hostId: ${result.hostId})`)
    } else {
      errors++
      details.push(`❌ ${am.assetId}: ${result.error}`)
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/admin/monitoring')
  return { processed: pendingAssets.length, synced, errors, details }
}

/**
 * Get monitoring statistics for a tenant (used in dashboard widget).
 */
export async function getMonitoringStats(tenantId: string) {
  const [total, active, pending, error, disabled] = await Promise.all([
    prisma.assetMonitoring.count({ where: { asset: { tenantId } } }),
    prisma.assetMonitoring.count({ where: { asset: { tenantId }, status: 'ACTIVE', monitoringEnabled: true } }),
    prisma.assetMonitoring.count({ where: { asset: { tenantId }, status: 'PENDING', monitoringEnabled: true } }),
    prisma.assetMonitoring.count({ where: { asset: { tenantId }, status: 'ERROR', monitoringEnabled: true } }),
    prisma.assetMonitoring.count({ where: { asset: { tenantId }, monitoringEnabled: false } }),
  ])

  return { total, active, pending, error, disabled }
}
