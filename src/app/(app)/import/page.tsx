import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ImportClient } from './import-client'

export default async function ImportPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'CLIENT_ADMIN') redirect('/assets')

  return <ImportClient role={session.user.role} tenantId={session.user.activeTenantId ?? session.user.tenantId ?? ''} />
}
