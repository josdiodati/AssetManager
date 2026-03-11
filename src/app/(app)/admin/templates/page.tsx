import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTemplate } from '@/lib/actions/templates'
import { DEFAULT_TEMPLATE_SUBJECT, DEFAULT_TEMPLATE_BODY } from '@/lib/template-defaults'
import { getTenants } from '@/lib/actions/tenants'
import TemplatesClient from './templates-client'

export default async function TemplatesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  const canEdit = role === 'SUPER_ADMIN' || role === 'INTERNAL_ADMIN'

  if (role === 'SUPER_ADMIN') {
    const tenants = await getTenants()
    return (
      <TemplatesClient
        tenantId={null}
        canEdit={canEdit}
        initialSubject={DEFAULT_TEMPLATE_SUBJECT}
        initialBody={DEFAULT_TEMPLATE_BODY}
        defaultSubject={DEFAULT_TEMPLATE_SUBJECT}
        defaultBody={DEFAULT_TEMPLATE_BODY}
        tenants={tenants.map(t => ({ id: t.id, name: t.name }))}
      />
    )
  }

  const tenantId = session.user.activeTenantId
  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Plantillas de email</h1>
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No hay tenant activo para esta sesión.
        </div>
      </div>
    )
  }

  const template = await getTemplate(tenantId)

  return (
    <TemplatesClient
      tenantId={tenantId}
      canEdit={canEdit}
      initialSubject={template?.emailSubject ?? DEFAULT_TEMPLATE_SUBJECT}
      initialBody={template?.bodyHtml ?? DEFAULT_TEMPLATE_BODY}
      defaultSubject={DEFAULT_TEMPLATE_SUBJECT}
      defaultBody={DEFAULT_TEMPLATE_BODY}
    />
  )
}
