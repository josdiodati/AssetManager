import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getAlertCount } from '@/lib/actions/alerts'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  let alertCount = 0
  try {
    alertCount = await getAlertCount()
  } catch {
    // Non-blocking: don't fail layout if alerts query fails
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={session.user.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={session.user} alertCount={alertCount} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
