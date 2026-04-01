'use server'

import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { syncMonitoringConfigToDatabase } from '@/lib/monitoring-config'

export async function reloadMonitoringYaml() {
  const session = await auth()
  if (!session || !['SUPER_ADMIN', 'INTERNAL_ADMIN'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }

  const result = await syncMonitoringConfigToDatabase()
  revalidatePath('/admin/config')
  revalidatePath('/admin/monitoring')
  revalidatePath('/assets/new')
  return result
}
