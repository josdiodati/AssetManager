'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'INTERNAL_ADMIN', 'CLIENT_ADMIN']),
  tenantId: z.string().nullable().optional(),
  language: z.enum(['es', 'en']).default('es'),
})

const userUpdateSchema = userCreateSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
})

export async function getUsers(tenantId?: string | null) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')
  const where: any = { deletedAt: null }
  if (session.user.role === 'INTERNAL_ADMIN' && tenantId) where.tenantId = tenantId
  return prisma.user.findMany({ where, orderBy: { name: 'asc' }, include: { tenant: { select: { name: true } } } })
}

export async function createUser(data: z.infer<typeof userCreateSchema>) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')
  const parsed = userCreateSchema.parse(data)
  const { password, ...rest } = parsed
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({ data: { ...rest, passwordHash, tenantId: rest.tenantId ?? null } })
  revalidatePath('/admin/users')
  return user
}

export async function updateUser(id: string, data: z.infer<typeof userUpdateSchema>) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')
  const { password, ...rest } = data
  const updateData: any = { ...rest }
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.update({ where: { id }, data: updateData })
  revalidatePath('/admin/users')
  return user
}

export async function deleteUser(id: string) {
  const session = await auth()
  if (!session || session.user.role === 'CLIENT_ADMIN') throw new Error('Unauthorized')
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), active: false } })
  revalidatePath('/admin/users')
}
