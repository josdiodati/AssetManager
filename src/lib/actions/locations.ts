'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getLocations(tenantId: string) {
  return prisma.location.findMany({
    where: { tenantId, deletedAt: null, active: true },
    orderBy: [{ site: 'asc' }, { area: 'asc' }]
  })
}

export async function createLocation(data: { tenantId: string; site: string; area?: string; detail?: string }) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  const location = await prisma.location.create({ data })
  revalidatePath('/admin/locations')
  return location
}

export async function updateLocation(id: string, data: { site?: string; area?: string; detail?: string; active?: boolean }) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.location.update({ where: { id }, data })
  revalidatePath('/admin/locations')
}

export async function deleteLocation(id: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.location.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidatePath('/admin/locations')
}
