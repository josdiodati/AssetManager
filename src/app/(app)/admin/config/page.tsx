import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAssetTypeMasters } from '@/lib/actions/config'
import { ConfigClient } from './config-client'

export default async function ConfigPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const typeNames = await getAssetTypeMasters()
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

  return <ConfigClient typeNames={typeNames} isSuperAdmin={isSuperAdmin} />
}
