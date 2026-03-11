import { getUsers } from '@/lib/actions/users'
import { getTenants } from '@/lib/actions/tenants'
import { auth } from '@/lib/auth'
import { UsersClient } from './users-client'

export default async function UsersPage() {
  const session = await auth()
  const users = await getUsers()
  const tenants = session?.user.role === 'SUPER_ADMIN' ? await getTenants() : []
  return <UsersClient users={users} tenants={tenants} currentRole={session?.user.role ?? ''} />
}
