import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAuditLogs, getAuditEntityTypes } from '@/lib/actions/audit'
import { AuditClient } from './audit-client'

export default async function AuditPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [{ logs, total, isSuperAdmin, entityNames }, entityTypes] = await Promise.all([
    getAuditLogs({ page: 1, pageSize: 50 }),
    getAuditEntityTypes(),
  ])

  return (
    <AuditClient
      initialLogs={logs}
      initialTotal={total}
      isSuperAdmin={isSuperAdmin}
      entityTypes={entityTypes}
      initialEntityNames={entityNames}
    />
  )
}
