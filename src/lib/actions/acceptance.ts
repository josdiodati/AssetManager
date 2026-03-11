'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { sendAcceptanceEmail } from '@/lib/email'

export async function generateAcceptanceToken(assetId: string) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      assignedPerson: true,
      assetType: { select: { name: true } },
      brand: { select: { name: true } },
      model: { select: { name: true } },
    },
  })

  if (!asset) throw new Error('Asset not found')
  if (!asset.assignedPersonId || !asset.assignedPerson) throw new Error('El activo no tiene persona asignada')
  if (!asset.assignedPerson.email) throw new Error('La persona no tiene email registrado')

  // Invalidate existing unused tokens for this asset (those not yet accepted or rejected)
  await prisma.acceptanceToken.updateMany({
    where: {
      assetId,
      acceptedAt: null,
      rejectedAt: null,
    },
    data: { expiresAt: new Date() },
  })

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await prisma.acceptanceToken.create({
    data: {
      assetId,
      personId: asset.assignedPersonId,
      emailSentTo: asset.assignedPerson.email,
      token,
      expiresAt,
    },
  })

  // Update asset acceptance status to PENDING
  await prisma.asset.update({
    where: { id: assetId },
    data: { acceptanceStatus: 'PENDING' as any },
  })

  const baseUrl = process.env.ACCEPTANCE_BASE_URL ?? 'http://localhost:3000'
  const acceptanceUrl = `${baseUrl}/accept/${token}`

  // Send email
  await sendAcceptanceEmail({
    to: asset.assignedPerson.email,
    personName: asset.assignedPerson.name,
    assetTag: asset.assetTag,
    assetTypeName: asset.assetType?.name ?? 'Activo',
    brandName: asset.brand?.name,
    modelName: asset.model?.name,
    serialNumber: asset.serialNumber,
    acceptanceUrl,
  })

  await prisma.auditLog.create({
    data: {
      tenantId: asset.tenantId,
      userId: session.user.id,
      entityType: 'asset',
      entityId: assetId,
      action: 'acceptance_token_generated',
      afterData: { token, expiresAt, sentTo: asset.assignedPerson.email },
      source: 'WEB',
    },
  })

  revalidatePath(`/assets/${assetId}`)
  return { token, acceptanceUrl, sentTo: asset.assignedPerson.email }
}

export async function getAcceptancePageData(token: string) {
  const record = await prisma.acceptanceToken.findUnique({
    where: { token },
    include: {
      asset: {
        include: {
          assetType: { select: { name: true, category: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
          location: { select: { site: true, area: true, detail: true } },
          assignedPerson: { select: { name: true, email: true, area: true, position: true } },
        },
      },
    },
  })

  if (!record) return { status: 'not_found' as const }
  if (record.acceptedAt || record.rejectedAt) return { status: 'already_used' as const }
  if (record.expiresAt < new Date()) return { status: 'expired' as const }

  return { status: 'valid' as const, record }
}

export async function submitAcceptance(token: string, action: 'accept' | 'decline', signature?: string) {
  const record = await prisma.acceptanceToken.findUnique({
    where: { token },
    include: { asset: true },
  })

  if (!record) throw new Error('Token inválido')
  if (record.acceptedAt || record.rejectedAt) throw new Error('Este enlace ya fue utilizado')
  if (record.expiresAt < new Date()) throw new Error('Este enlace ha expirado')

  const newAcceptanceStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED'
  const now = new Date()

  await prisma.$transaction([
    prisma.acceptanceToken.update({
      where: { token },
      data: action === 'accept' ? { acceptedAt: now } : { rejectedAt: now },
    }),
    prisma.asset.update({
      where: { id: record.assetId },
      data: { acceptanceStatus: newAcceptanceStatus as any },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: record.asset.tenantId,
        userId: null,
        entityType: 'asset',
        entityId: record.assetId,
        action: action === 'accept' ? 'acceptance_accepted' : 'acceptance_declined',
        afterData: { acceptanceStatus: newAcceptanceStatus, personId: record.personId },
        source: 'WEB',
      },
    }),
  ])

  return { success: true, action }
}
