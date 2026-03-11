import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAlerts } from '@/lib/actions/alerts'
import { AlertsClient } from './alerts-client'

export default async function AlertsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const alerts = await getAlerts()

  return <AlertsClient alerts={alerts} />
}
