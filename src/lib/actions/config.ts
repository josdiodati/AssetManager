'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ─── AssetTypeMaster ──────────────────────────────────────────────────────────

export async function getAssetTypeMasters() {
  return prisma.assetTypeMaster.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })
}

export async function createAssetTypeMaster(name: string) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  const item = await prisma.assetTypeMaster.create({ data: { name: name.trim() } })
  revalidatePath('/admin/config')
  return item
}

export async function updateAssetTypeMaster(id: string, name: string) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  const item = await prisma.assetTypeMaster.update({ where: { id }, data: { name: name.trim() } })
  revalidatePath('/admin/config')
  return item
}

export async function deleteAssetTypeMaster(id: string) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  await prisma.assetTypeMaster.update({ where: { id }, data: { active: false } })
  revalidatePath('/admin/config')
}

// ─── AssetCategory ────────────────────────────────────────────────────────────

export async function getAssetCategories() {
  return prisma.assetCategory.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })
}

export async function getActiveAssetCategories() {
  return prisma.assetCategory.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })
}

export async function createAssetCategory(data: { code: string; name: string; description?: string }) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  const code = data.code.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20)
  const item = await prisma.assetCategory.create({
    data: { code, name: data.name.trim(), description: data.description?.trim() ?? null },
  })
  revalidatePath('/admin/config')
  revalidatePath('/admin/asset-types')
  return item
}

export async function updateAssetCategory(id: string, data: { name?: string; description?: string; code?: string }) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  const update: any = {}
  if (data.name !== undefined) update.name = data.name.trim()
  if (data.description !== undefined) update.description = data.description.trim() || null
  if (data.code !== undefined) update.code = data.code.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20)
  const item = await prisma.assetCategory.update({ where: { id }, data: update })
  revalidatePath('/admin/config')
  revalidatePath('/admin/asset-types')
  return item
}

export async function toggleAssetCategoryActive(id: string) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  const cat = await prisma.assetCategory.findUnique({ where: { id } })
  if (!cat) throw new Error('Categoría no encontrada')
  await prisma.assetCategory.update({ where: { id }, data: { active: !cat.active } })
  revalidatePath('/admin/config')
  revalidatePath('/admin/asset-types')
  return { active: !cat.active }
}
