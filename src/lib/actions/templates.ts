'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getTemplate(tenantId: string) {
  return prisma.acceptanceTemplate.findFirst({
    where: { tenantId, isDefault: true, active: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function saveTemplate(
  tenantId: string,
  data: { subject: string; bodyHtml: string }
) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  const role = session.user.role
  if (role === 'CLIENT_ADMIN') throw new Error('Sin permisos para editar plantillas')
  if (role === 'INTERNAL_ADMIN' && session.user.activeTenantId !== tenantId) {
    throw new Error('Sin permisos para editar plantillas de otro tenant')
  }

  const existing = await prisma.acceptanceTemplate.findFirst({
    where: { tenantId, isDefault: true, active: true },
  })

  if (existing) {
    await prisma.acceptanceTemplate.update({
      where: { id: existing.id },
      data: {
        emailSubject: data.subject,
        bodyHtml: data.bodyHtml,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    })
  } else {
    await prisma.acceptanceTemplate.create({
      data: {
        tenantId,
        name: 'Plantilla de aceptación',
        language: 'es',
        emailSubject: data.subject,
        bodyHtml: data.bodyHtml,
        isDefault: true,
        active: true,
        version: 1,
        createdById: session.user.id,
      },
    })
  }

  revalidatePath('/admin/templates')
}
