import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMonitoringTemplates } from '@/lib/actions/monitoring'
import { MonitoringTemplatesClient } from './templates-client'

export default async function MonitoringTemplatesPage() {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const templates = await getMonitoringTemplates()
  return <MonitoringTemplatesClient templates={templates} />
}
