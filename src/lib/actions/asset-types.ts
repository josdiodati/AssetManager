'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getAssetTypes(tenantId?: string | null) {
  const where: any = { active: true, OR: [{ tenantId: null }] }
  if (tenantId) where.OR.push({ tenantId })
  return prisma.assetType.findMany({
    where,
    include: { category: true },
    orderBy: { name: 'asc' },
  })
}

export async function createAssetType(data: {
  name: string; categoryId: string; requiresApproval: boolean;
  allowsPersonAssignment: boolean; fieldConfig: any; tenantId?: string | null
}) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')
  const assetType = await prisma.assetType.create({ data: data as any })
  revalidatePath('/admin/asset-types')
  return assetType
}

export async function updateAssetType(id: string, data: Partial<{
  name: string; categoryId: string; requiresApproval: boolean;
  allowsPersonAssignment: boolean; active: boolean
}>) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')
  const assetType = await prisma.assetType.update({ where: { id }, data })
  revalidatePath('/admin/asset-types')
  return assetType
}
