import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAssetCategories } from '@/lib/actions/config'
import { ConfigClient } from './config-client'

export default async function ConfigPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const categories = await getAssetCategories()
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

  return <ConfigClient categories={categories} isSuperAdmin={isSuperAdmin} />
}
