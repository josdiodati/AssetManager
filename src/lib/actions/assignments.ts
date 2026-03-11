'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function assignAsset(assetId: string, personId: string, notes?: string) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')

  const asset = await prisma.asset.findUnique({ where: { id: assetId } })
  if (!asset) throw new Error('Asset not found')
  if (asset.status === 'ASSIGNED') throw new Error('El activo ya está asignado')

  const fromPersonId = asset.assignedPersonId

  let newStatus: string
  let newApprovalStatus: string

  if (asset.requiresApproval) {
    newStatus = 'PENDING_APPROVAL'
    newApprovalStatus = 'PENDING'
  } else {
    newStatus = 'ASSIGNED'
    newApprovalStatus = 'NOT_REQUIRED'
  }

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      assignedPersonId: personId,
      assignedAt: new Date(),
      status: newStatus as any,
      approvalStatus: newApprovalStatus as any,
    },
  })

  await prisma.assignmentHistory.create({
    data: {
      assetId,
      action: fromPersonId ? 'REASSIGNED' as any : 'ASSIGNED' as any,
      fromPersonId: fromPersonId ?? null,
      toPersonId: personId,
      performedById: session.user.id,
      notes: notes ?? null,
    },
  })

  if (asset.requiresApproval) {
    await prisma.approvalEvent.create({
      data: {
        assetId,
        action: 'SUBMITTED' as any,
        performedById: session.user.id,
        comment: notes ?? null,
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      tenantId: asset.tenantId,
      userId: session.user.id,
      entityType: 'asset',
      entityId: assetId,
      action: asset.requiresApproval ? 'assignment_submitted' : 'assigned',
      afterData: { personId, status: newStatus },
      source: 'WEB',
    },
  })

  revalidatePath(`/assets/${assetId}`)
  revalidatePath('/assets')
  return { requiresApproval: asset.requiresApproval }
}

export async function unassignAsset(assetId: string, notes?: string) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')

  const asset = await prisma.asset.findUnique({ where: { id: assetId } })
  if (!asset) throw new Error('Asset not found')
  if (!asset.assignedPersonId && asset.status !== 'PENDING_APPROVAL') throw new Error('El activo no está asignado')

  const fromPersonId = asset.assignedPersonId

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      assignedPersonId: null,
      assignedAt: null,
      status: 'AVAILABLE' as any,
      approvalStatus: 'NOT_REQUIRED' as any,
    },
  })

  await prisma.assignmentHistory.create({
    data: {
      assetId,
      action: 'UNASSIGNED' as any,
      fromPersonId: fromPersonId ?? null,
      toPersonId: null,
      performedById: session.user.id,
      notes: notes ?? null,
    },
  })

  await prisma.auditLog.create({
    data: {
      tenantId: asset.tenantId,
      userId: session.user.id,
      entityType: 'asset',
      entityId: assetId,
      action: 'unassigned',
      afterData: { status: 'AVAILABLE' },
      source: 'WEB',
    },
  })

  revalidatePath(`/assets/${assetId}`)
  revalidatePath('/assets')
}

export async function approveAssignment(assetId: string, comment?: string) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')

  const asset = await prisma.asset.findUnique({ where: { id: assetId } })
  if (!asset) throw new Error('Asset not found')
  if (asset.status !== 'PENDING_APPROVAL') throw new Error('El activo no está pendiente de aprobación')

  await prisma.asset.update({
    where: { id: assetId },
    data: { status: 'ASSIGNED' as any, approvalStatus: 'APPROVED' as any },
  })

  await prisma.approvalEvent.create({
    data: {
      assetId,
      action: 'APPROVED' as any,
      performedById: session.user.id,
      comment: comment ?? null,
    },
  })

  await prisma.auditLog.create({
    data: {
      tenantId: asset.tenantId,
      userId: session.user.id,
      entityType: 'asset',
      entityId: assetId,
      action: 'assignment_approved',
      afterData: { status: 'ASSIGNED', approvalStatus: 'APPROVED' },
      source: 'WEB',
    },
  })

  revalidatePath(`/assets/${assetId}`)
  revalidatePath('/assets')
}

export async function rejectAssignment(assetId: string, comment: string) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')

  const asset = await prisma.asset.findUnique({ where: { id: assetId } })
  if (!asset) throw new Error('Asset not found')
  if (asset.status !== 'PENDING_APPROVAL') throw new Error('El activo no está pendiente de aprobación')

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      status: 'AVAILABLE' as any,
      approvalStatus: 'REJECTED' as any,
      assignedPersonId: null,
      assignedAt: null,
    },
  })

  await prisma.approvalEvent.create({
    data: {
      assetId,
      action: 'REJECTED' as any,
      performedById: session.user.id,
      comment,
    },
  })

  await prisma.auditLog.create({
    data: {
      tenantId: asset.tenantId,
      userId: session.user.id,
      entityType: 'asset',
      entityId: assetId,
      action: 'assignment_rejected',
      afterData: { status: 'AVAILABLE', approvalStatus: 'REJECTED' },
      source: 'WEB',
    },
  })

  revalidatePath(`/assets/${assetId}`)
  revalidatePath('/assets')
}
