import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import path from 'path'
import { promises as fs } from 'fs'
import { getAssetCategories } from '@/lib/actions/config'
import { ConfigClient } from './config-client'
import { readMonitoringConfig, syncMonitoringConfigToDatabase } from '@/lib/monitoring-config'

export default async function ConfigPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params = await searchParams
  const initialTab = params?.tab === 'monitoring' ? 'monitoring' : 'general'
  const categories = await getAssetCategories()
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN'
  const configPath = process.env.MONITORING_CONFIG_PATH || path.join(process.cwd(), 'config', 'monitoring.yml')
  const monitoringConfig = await readMonitoringConfig()
  const monitoringSync = await syncMonitoringConfigToDatabase()
  const monitoringRawYaml = await fs.readFile(configPath, 'utf8')

  return (
    <ConfigClient
      categories={categories}
      isSuperAdmin={isSuperAdmin}
      initialTab={initialTab}
      monitoringConfigPath={configPath}
      monitoringVersion={monitoringConfig.version}
      monitoringRawYaml={monitoringRawYaml}
      monitoringSync={monitoringSync}
    />
  )
}
