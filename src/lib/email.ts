import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { generateBlankAcceptancePdf } from '@/lib/generate-acceptance-pdf'
import { DEFAULT_EMAIL_SUBJECT, DEFAULT_EMAIL_BODY } from '@/lib/email-defaults'

export { DEFAULT_EMAIL_SUBJECT, DEFAULT_EMAIL_BODY } from '@/lib/email-defaults'

const resend = new Resend(process.env.RESEND_API_KEY)

interface TemplateVars {
  personName: string
  assetTag: string
  assetType: string
  brand: string
  model: string
  serialNumber: string
  acceptanceUrl: string
}

function applyVars(template: string, vars: TemplateVars): string {
  return template
    .replaceAll('{{personName}}', vars.personName)
    .replaceAll('{{assetTag}}', vars.assetTag)
    .replaceAll('{{assetType}}', vars.assetType)
    .replaceAll('{{brand}}', vars.brand)
    .replaceAll('{{model}}', vars.model)
    .replaceAll('{{serialNumber}}', vars.serialNumber)
    .replaceAll('{{acceptanceUrl}}', vars.acceptanceUrl)
}

export async function sendAcceptanceEmail({
  tenantId,
  tenantName,
  to,
  personName,
  assetTag,
  assetTypeName,
  brandName,
  modelName,
  serialNumber,
  acceptanceUrl,
}: {
  tenantId: string
  tenantName?: string
  to: string
  personName: string
  assetTag: string
  assetTypeName: string
  brandName?: string | null
  modelName?: string | null
  serialNumber?: string | null
  acceptanceUrl: string
}) {
  const from = process.env.EMAIL_FROM ?? 'noreply@kawellu.com.ar'

  const vars: TemplateVars = {
    personName,
    assetTag,
    assetType: assetTypeName,
    brand: brandName ?? '',
    model: modelName ?? '',
    serialNumber: serialNumber ?? '—',
    acceptanceUrl,
  }

  // Try to load template from DB
  const dbTemplate = await prisma.acceptanceTemplate.findFirst({
    where: { tenantId, isDefault: true, active: true },
    orderBy: { createdAt: 'desc' },
  })

  const subject = applyVars(
    dbTemplate?.emailSubject ?? DEFAULT_EMAIL_SUBJECT,
    vars
  )
  const html = applyVars(
    dbTemplate?.bodyHtml ?? DEFAULT_EMAIL_BODY,
    vars
  )

  // Generate PDF attachment
  const tenantDisplayName = tenantName ??
    (await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }))?.name ??
    'Organización'

  let pdfAttachment: { filename: string; content: string } | undefined
  try {
    const pdfBuffer = await generateBlankAcceptancePdf({
      tenantId,
      tenantName: tenantDisplayName,
      assetTag,
      assetType: assetTypeName,
      brandName: brandName ?? '',
      modelName: modelName ?? '',
      serialNumber: serialNumber ?? null,
    })
    pdfAttachment = {
      filename: `reglamento-uso-${assetTag}.pdf`,
      content: pdfBuffer.toString('base64'),
    }
  } catch (e) {
    console.error('PDF attachment generation failed:', e)
  }

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html,
    attachments: pdfAttachment ? [{ filename: pdfAttachment.filename, content: pdfAttachment.content }] : undefined,
  })

  return result
}
