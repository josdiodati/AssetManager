'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const tenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  active: z.boolean().default(true),
})

export async function getTenants() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  return prisma.tenant.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } })
}

export async function createTenant(data: z.infer<typeof tenantSchema>) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  const parsed = tenantSchema.parse(data)
  const tenant = await prisma.tenant.create({ data: { ...parsed, config: {} } })
  revalidatePath('/admin/tenants')
  return tenant
}

export async function updateTenant(id: string, data: Partial<z.infer<typeof tenantSchema>>) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  const tenant = await prisma.tenant.update({ where: { id }, data })
  revalidatePath('/admin/tenants')
  return tenant
}

export async function deleteTenant(id: string) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  await prisma.tenant.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidatePath('/admin/tenants')
}

export async function getTenantsForAdmins() {
  const session = await auth()
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INTERNAL_ADMIN")) {
    throw new Error("Unauthorized")
  }
  return prisma.tenant.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } })
}
