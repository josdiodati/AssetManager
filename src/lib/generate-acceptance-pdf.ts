import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { AcceptancePdfDocument, AcceptancePdfData } from './acceptance-pdf'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function generateAndSaveAcceptancePdf(data: AcceptancePdfData): Promise<string> {
  const constanciaId = randomUUID()
  const dataWithId: AcceptancePdfData = { ...data, constanciaId }

  const buffer = await renderToBuffer(
    React.createElement(AcceptancePdfDocument, { data: dataWithId }) as any
  )

  const base64 = buffer.toString('base64')
  const filename = `constancia-${data.assetTag}-${data.acceptedAt.toISOString().slice(0, 10)}.pdf`

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
        acceptedAt: data.acceptedAt.toISOString(),
        ipAddress: data.ipAddress ?? null,
        acceptanceTokenId: data.acceptanceTokenId,
      },
    },
  })

  return constanciaId
}
