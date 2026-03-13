'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function getTenantFilter(session: any) {
  if (session.user.role === 'CLIENT_ADMIN') return session.user.tenantId
  return session.user.activeTenantId
}

export async function getAssets(filters?: {
  tenantId?: string; status?: string; assetTypeId?: string;
  search?: string; page?: number; pageSize?: number
}) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const tenantId = getTenantFilter(session)
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 50

  const where: any = { deletedAt: null }
  if (tenantId) where.tenantId = tenantId
  if (filters?.status) where.status = filters.status
  if (filters?.assetTypeId) where.assetTypeId = filters.assetTypeId
  if (filters?.search) {
    where.OR = [
      { assetTag: { contains: filters.search, mode: 'insensitive' } },
      { serialNumber: { contains: filters.search, mode: 'insensitive' } },
      { hostname: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        assetType: { include: { category: { select: { code: true, name: true } } } },
        brand: { select: { name: true } },
        model: { select: { name: true } },
        assignedPerson: { select: { name: true, email: true } },
        location: { select: { site: true, area: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ])

  return { assets, total, page, pageSize }
}

export async function getAsset(id: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  const tenantId = getTenantFilter(session)

  const asset = await prisma.asset.findFirst({
    where: { id, deletedAt: null, ...(tenantId ? { tenantId } : {}) },
    include: {
      assetType: { include: { category: true } },
      brand: true,
      model: true,
      assignedPerson: true,
      location: true,
      createdBy: { select: { name: true, email: true } },
      images: { orderBy: { createdAt: 'asc' } },
      attachments: { orderBy: { createdAt: 'asc' } },
      assignmentHistory: {
        include: {
          fromPerson: { select: { name: true } },
          toPerson: { select: { name: true } },
          performedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      approvalEvents: {
        include: { performedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      documents: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          filename: true,
          mimeType: true,
          createdAt: true,
          metadata: true,
        },
      },
    },
  })
  if (!asset) throw new Error('Asset not found')
  return asset
}

async function generateAssetTag(tenantId: string, categoryCode: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  const config = (tenant?.config as any) ?? {}
  const prefix = config.assetTagPrefix ?? tenant?.slug?.toUpperCase().slice(0, 4) ?? 'ASSET'
  const typeCode = categoryCode.slice(0, 3).toUpperCase()

  const count = await prisma.asset.count({ where: { tenantId } })
  const seq = String(count + 1).padStart(4, '0')
  return `${prefix}-${typeCode}-${seq}`
}

export async function createAsset(data: {
  tenantId: string; assetTypeId: string; condition?: string;
  brandId?: string; modelId?: string; serialNumber?: string; description?: string;
  locationId?: string; requiresApproval?: boolean;
  hostname?: string; os?: string; cpu?: string; ram?: string; storageCapacity?: string;
  ipAddress?: string; macAddress?: string; firmwareVersion?: string; antivirus?: string;
  warrantyExpiresAt?: string; eolDate?: string;
  providerName?: string; providerTaxId?: string; invoiceNumber?: string; invoiceDate?: string;
}) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')

  const assetType = await prisma.assetType.findUnique({
    where: { id: data.assetTypeId },
    include: { category: true },
  })
  if (!assetType) throw new Error('Asset type not found')

  const assetTag = await generateAssetTag(data.tenantId, assetType.category.code)

  const asset = await prisma.asset.create({
    data: {
      tenantId: data.tenantId,
      assetTag,
      assetTypeId: data.assetTypeId,
      status: 'AVAILABLE',
      condition: (data.condition as any) ?? 'NEW',
      brandId: data.brandId ?? null,
      modelId: data.modelId ?? null,
      serialNumber: data.serialNumber ?? null,
      description: data.description ?? null,
      locationId: data.locationId ?? null,
      requiresApproval: data.requiresApproval ?? assetType.requiresApproval,
      hostname: data.hostname ?? null,
      os: data.os ?? null,
      cpu: data.cpu ?? null,
      ram: data.ram ?? null,
      storageCapacity: data.storageCapacity ?? null,
      ipAddress: data.ipAddress ?? null,
      macAddress: data.macAddress ?? null,
      firmwareVersion: data.firmwareVersion ?? null,
      antivirus: data.antivirus ?? null,
      warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : null,
      eolDate: data.eolDate ? new Date(data.eolDate) : null,
      providerName: data.providerName ?? null,
      providerTaxId: data.providerTaxId ?? null,
      invoiceNumber: data.invoiceNumber ?? null,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
      createdById: session.user.id,
    },
  })

  await prisma.auditLog.create({
    data: {
      tenantId: data.tenantId,
      userId: session.user.id,
      entityType: 'asset',
      entityId: asset.id,
      action: 'created',
      afterData: { assetTag, assetTypeId: data.assetTypeId, status: 'AVAILABLE' },
      source: 'WEB',
    },
  })

  revalidatePath('/assets')
  return asset
}

export async function updateAsset(id: string, data: Partial<{
  condition: string; brandId: string; modelId: string; serialNumber: string;
  description: string; locationId: string; assignedArea: string; requiresApproval: boolean;
  hostname: string; os: string; cpu: string; ram: string; storageCapacity: string;
  ipAddress: string; macAddress: string; firmwareVersion: string; antivirus: string;
  warrantyExpiresAt: string; eolDate: string; providerName: string; providerTaxId: string;
  invoiceNumber: string; invoiceDate: string; repairNote: string; status: string;
}>) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const existing = await prisma.asset.findUnique({ where: { id } })
  if (!existing) throw new Error('Asset not found')

  const updateData: any = { ...data }
  if (data.warrantyExpiresAt) updateData.warrantyExpiresAt = new Date(data.warrantyExpiresAt)
  else if (data.warrantyExpiresAt === '') updateData.warrantyExpiresAt = null
  if (data.eolDate) updateData.eolDate = new Date(data.eolDate)
  else if (data.eolDate === '') updateData.eolDate = null
  if (data.invoiceDate) updateData.invoiceDate = new Date(data.invoiceDate)
  else if (data.invoiceDate === '') updateData.invoiceDate = null

  const asset = await prisma.asset.update({ where: { id }, data: updateData })

  await prisma.auditLog.create({
    data: {
      tenantId: existing.tenantId,
      userId: session.user.id,
      entityType: 'asset',
      entityId: id,
      action: 'updated',
      beforeData: existing as any,
      afterData: updateData,
      source: 'WEB',
    },
  })

  revalidatePath(`/assets/${id}`)
  revalidatePath('/assets')
  return asset
}

export async function deleteAsset(id: string) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')

  const existing = await prisma.asset.findUnique({ where: { id } })
  if (!existing) throw new Error('Asset not found')

  await prisma.asset.update({ where: { id }, data: { deletedAt: new Date(), active: false } })

  await prisma.auditLog.create({
    data: {
      tenantId: existing.tenantId,
      userId: session.user.id,
      entityType: 'asset',
      entityId: id,
      action: 'deleted',
      source: 'WEB',
    },
  })

  revalidatePath('/assets')
}
