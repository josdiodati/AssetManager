import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  ASSIGNED: 'Asignado',
  PENDING_APPROVAL: 'Pend. Aprobación',
  IN_REPAIR: 'En Reparación',
  ON_LOAN: 'En Préstamo',
  OBSOLETE: 'Obsoleto',
  LOST: 'Perdido',
  STOLEN: 'Robado',
  DECOMMISSIONED: 'Dado de Baja',
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  GOOD: 'Bueno',
  FAIR: 'Regular',
  POOR: 'Malo',
  DAMAGED: 'Dañado',
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const role = session.user.role
  const status = searchParams.get('status') ?? undefined
  const assetTypeId = searchParams.get('assetTypeId') ?? undefined
  const search = searchParams.get('search') ?? undefined

  let tenantId: string | undefined
  if (role === 'SUPER_ADMIN') {
    tenantId = searchParams.get('tenantId') ?? undefined
  } else if (role === 'CLIENT_ADMIN') {
    tenantId = session.user.tenantId ?? undefined
  } else {
    tenantId = session.user.activeTenantId ?? undefined
  }

  const where: any = { deletedAt: null }
  if (tenantId) where.tenantId = tenantId
  if (status) where.status = status
  if (assetTypeId) where.assetTypeId = assetTypeId
  if (search) {
    where.OR = [
      { assetTag: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { hostname: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const assets = await prisma.asset.findMany({
    where,
    include: {
      assetType: { select: { name: true } },
      brand: { select: { name: true } },
      model: { select: { name: true } },
      assignedPerson: { select: { name: true } },
      location: { select: { site: true, area: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AssetManager'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Activos')

  sheet.columns = [
    { header: 'Tag', key: 'tag', width: 16 },
    { header: 'Descripción', key: 'descripcion', width: 28 },
    { header: 'Tipo', key: 'tipo', width: 18 },
    { header: 'Marca', key: 'marca', width: 16 },
    { header: 'Modelo', key: 'modelo', width: 18 },
    { header: 'S/N', key: 'sn', width: 20 },
    { header: 'Estado', key: 'estado', width: 18 },
    { header: 'Condición', key: 'condicion', width: 14 },
    { header: 'Ubicación', key: 'ubicacion', width: 22 },
    { header: 'Asignado a', key: 'asignado', width: 22 },
    { header: 'Garantía hasta', key: 'garantia', width: 16 },
    { header: 'EOL', key: 'eol', width: 14 },
    { header: 'Hostname', key: 'hostname', width: 20 },
    { header: 'CPU', key: 'cpu', width: 20 },
    { header: 'RAM', key: 'ram', width: 10 },
    { header: 'Storage', key: 'storage', width: 14 },
    { header: 'OS', key: 'os', width: 18 },
    { header: 'IP', key: 'ip', width: 16 },
    { header: 'MAC', key: 'mac', width: 18 },
    { header: 'Creado', key: 'creado', width: 20 },
    { header: 'Actualizado', key: 'actualizado', width: 20 },
  ]

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
  headerRow.alignment = { vertical: 'middle' }
  headerRow.height = 20

  for (const asset of assets) {
    const locationStr = asset.location
      ? [asset.location.site, asset.location.area].filter(Boolean).join(' / ')
      : ''

    sheet.addRow({
      tag: asset.assetTag,
      descripcion: asset.description ?? '',
      tipo: asset.assetType?.name ?? '',
      marca: asset.brand?.name ?? '',
      modelo: asset.model?.name ?? '',
      sn: asset.serialNumber ?? '',
      estado: STATUS_LABELS[asset.status] ?? asset.status,
      condicion: CONDITION_LABELS[asset.condition] ?? asset.condition,
      ubicacion: locationStr,
      asignado: asset.assignedPerson?.name ?? '',
      garantia: asset.warrantyExpiresAt ? asset.warrantyExpiresAt.toISOString().split('T')[0] : '',
      eol: asset.eolDate ? asset.eolDate.toISOString().split('T')[0] : '',
      hostname: asset.hostname ?? '',
      cpu: asset.cpu ?? '',
      ram: asset.ram ?? '',
      storage: asset.storageCapacity ?? '',
      os: asset.os ?? '',
      ip: asset.ipAddress ?? '',
      mac: asset.macAddress ?? '',
      creado: asset.createdAt.toISOString().split('T')[0],
      actualizado: asset.updatedAt.toISOString().split('T')[0],
    })
  }

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columns.length },
  }

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await workbook.xlsx.writeBuffer()

  const today = new Date().toISOString().split('T')[0]
  const filename = `activos-${today}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
