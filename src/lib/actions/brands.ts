'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getBrands() {
  return prisma.brand.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
}

export async function getBrandsWithModels() {
  return prisma.brand.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: { models: { where: { active: true }, orderBy: { name: 'asc' } } }
  })
}

export async function createBrand(name: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  const brand = await prisma.brand.create({ data: { name } })
  revalidatePath('/admin/brands')
  return brand
}

export async function createModel(brandId: string, name: string, assetTypeName?: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  const model = await prisma.model.create({ data: { brandId, name, assetTypeName: assetTypeName ?? null } })
  revalidatePath('/admin/brands')
  return model
}

export async function updateBrand(id: string, data: { name?: string; active?: boolean }) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.brand.update({ where: { id }, data })
  revalidatePath('/admin/brands')
}

export async function updateModel(id: string, data: { name?: string; active?: boolean; assetTypeName?: string | null }) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.model.update({ where: { id }, data })
  revalidatePath('/admin/brands')
}
