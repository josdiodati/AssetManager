'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

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
