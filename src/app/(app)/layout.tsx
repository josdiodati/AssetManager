import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { getAlertCount } from '@/lib/actions/alerts'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  let alertCount = 0
  try {
    alertCount = await getAlertCount()
  } catch {
    // Non-blocking
  }

  // Badge = new alerts since user last visited /alerts
  const cookieStore = await cookies()
  const seenCount = parseInt(cookieStore.get('alerts_seen_count')?.value ?? '0', 10)
  const newAlertCount = Math.max(0, alertCount - seenCount)

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar role={session.user.role} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header user={session.user} alertCount={newAlertCount} />
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
