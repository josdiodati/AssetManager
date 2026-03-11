import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { AcceptancePdfDocument, AcceptancePdfData } from './acceptance-pdf'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { DEFAULT_PDF_CLAUSES, DEFAULT_PDF_WARNING, DEFAULT_PDF_TITLE } from '@/lib/pdf-template-defaults'

async function loadPdfTemplate(tenantId: string) {
  const template = await prisma.pdfTemplate.findFirst({
    where: { tenantId, active: true },
    orderBy: { version: 'desc' },
  })
  return {
    clauses: template ? (template.clauses as Array<{ title: string; body: string }>) : DEFAULT_PDF_CLAUSES,
    documentTitle: template?.title ?? DEFAULT_PDF_TITLE,
    warningText: template?.warning ?? DEFAULT_PDF_WARNING,
  }
}

export async function generateBlankAcceptancePdf(data: {
  tenantId: string
  tenantName: string
  assetTag: string
  assetType: string
  brandName: string
  modelName: string
  serialNumber: string | null
}): Promise<Buffer> {
  const { clauses, documentTitle, warningText } = await loadPdfTemplate(data.tenantId)
  return renderToBuffer(
    React.createElement(AcceptancePdfDocument, {
      data: {
        constanciaId: '',
        tenantName: data.tenantName,
        assetId: data.tenantId,
        tenantId: data.tenantId,
        assetTag: data.assetTag,
        assetType: data.assetType,
        brandName: data.brandName,
        modelName: data.modelName,
        serialNumber: data.serialNumber,
        personName: '—',
        personEmail: '—',
        acceptedAt: null,
        ipAddress: null,
        acceptanceTokenId: '',
        clauses,
        documentTitle,
        warningText,
      }
    }) as any
  ) as Promise<Buffer>
}

export async function generateAndSaveAcceptancePdf(data: AcceptancePdfData): Promise<string> {
  const constanciaId = randomUUID()
  const { clauses, documentTitle, warningText } = await loadPdfTemplate(data.tenantId!)
  const dataWithId: AcceptancePdfData = { ...data, constanciaId, clauses, documentTitle, warningText }

  const buffer = await renderToBuffer(
    React.createElement(AcceptancePdfDocument, { data: dataWithId }) as any
  ) as unknown as Buffer

  const base64 = buffer.toString('base64')
  const filename = `constancia-${data.assetTag}-${data.acceptedAt!.toISOString().slice(0, 10)}.pdf`

  await prisma.assetDocument.create({
    data: {
      assetId: data.assetId!,
      tenantId: data.tenantId!,
      type: 'ACCEPTANCE',
      filename,
      mimeType: 'application/pdf',
      content: base64,
      metadata: {
        constanciaId,
        personName: data.personName,
        personEmail: data.personEmail,
        acceptedAt: data.acceptedAt!.toISOString(),
        ipAddress: data.ipAddress ?? null,
        acceptanceTokenId: data.acceptanceTokenId,
      },
    },
  })

  return constanciaId
}
