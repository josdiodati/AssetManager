'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getPersons(tenantId?: string | null) {
  const where: any = { deletedAt: null, active: true }
  if (tenantId) where.tenantId = tenantId
  return prisma.person.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      location: { select: { site: true, area: true } },
      tenant: { select: { name: true } },
    },
  })
}

export async function createPerson(data: {
  tenantId: string; name: string; email: string;
  area?: string; position?: string; locationId?: string;
  hireDate?: string; notes?: string;
}) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  const person = await prisma.person.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      email: data.email,
      area: data.area ?? null,
      position: data.position ?? null,
      locationId: data.locationId ?? null,
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
      notes: data.notes ?? null,
    },
  })
  revalidatePath('/persons')
  return person
}

export async function updatePerson(id: string, data: Partial<{
  name: string; email: string; area: string; position: string;
  locationId: string; notes: string; active: boolean;
}>) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  const person = await prisma.person.update({ where: { id }, data })
  revalidatePath('/persons')
  return person
}

export async function deletePerson(id: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.person.update({ where: { id }, data: { deletedAt: new Date(), active: false } })
  revalidatePath('/persons')
}
