import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await params
  const doc = await prisma.assetDocument.findUnique({ where: { id } })
  if (!doc) return new NextResponse('Not found', { status: 404 })

  // Tenants can only access their own documents
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'INTERNAL_ADMIN') {
    const tenantId = session.user.activeTenantId ?? session.user.tenantId
    if (doc.tenantId !== tenantId) return new NextResponse('Forbidden', { status: 403 })
  }

  const buffer = Buffer.from(doc.content, 'base64')
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${doc.filename}"`,
      'Content-Length': buffer.length.toString(),
    },
  })
}
