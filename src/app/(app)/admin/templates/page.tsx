import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEmailTemplate, getPdfTemplate } from '@/lib/actions/templates'
import { getTenantsForAdmins } from '@/lib/actions/tenants'
import { TemplatesClient } from './templates-client'

export default async function TemplatesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenantId = session.user.role === 'CLIENT_ADMIN'
    ? session.user.tenantId
    : session.user.activeTenantId

  const tenants = session.user.role === 'SUPER_ADMIN' || session.user.role === 'INTERNAL_ADMIN'
    ? await getTenantsForAdmins()
    : []

  const [emailTemplate, pdfTemplate] = tenantId
    ? await Promise.all([getEmailTemplate(tenantId), getPdfTemplate(tenantId)])
    : [null, null]

  return (
    <TemplatesClient
      emailTemplate={emailTemplate}
      pdfTemplate={pdfTemplate}
      tenants={tenants}
      currentTenantId={tenantId ?? null}
      role={session.user.role}
    />
  )
}
