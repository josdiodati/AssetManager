import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parse } from 'csv-parse/sync'

const VALID_STATUSES = ['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'DECOMMISSIONED', 'OBSOLETE', 'PENDING_APPROVAL', 'ON_LOAN', 'LOST', 'STOLEN']
const VALID_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(val: string) {
  return UUID_RE.test(val)
}

// GET — download CSV template
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const headers = 'assetTag,description,serialNumber,status,condition,assetTypeId,brandId,modelId,locationId,hostname,cpu,ram,storageCapacity,os,ipAddress,macAddress,warrantyExpiresAt,eolDate'
  const example = 'LAP-001,Laptop Dell Latitude,SN123456,AVAILABLE,GOOD,Laptop,Dell,Latitude 5520,Oficina Central,,Intel Core i7,16GB,512GB SSD,Windows 11,192.168.1.100,AA:BB:CC:DD:EE:FF,2027-01-15,2028-01-15'
  const csv = `${headers}\n${example}\n`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="plantilla-importacion.csv"',
    },
  })
}

// POST — import CSV
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = session.user.role
  if (role === 'CLIENT_ADMIN') {
    return NextResponse.json({ error: 'Sin permisos para importar activos' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)

  let tenantId: string | undefined
  if (role === 'SUPER_ADMIN') {
    tenantId = searchParams.get('tenantId') ?? undefined
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido para SUPER_ADMIN' }, { status: 400 })
    }
  } else {
    tenantId = session.user.activeTenantId ?? undefined
    if (!tenantId) {
      return NextResponse.json({ error: 'No hay tenant activo en la sesión' }, { status: 400 })
    }
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }

  const text = await file.text()

  let records: Record<string, string>[]
  try {
    records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[]
  } catch (e: any) {
    return NextResponse.json({ error: `Error al parsear CSV: ${e.message}` }, { status: 400 })
  }

  // Cache for name→id lookups
  const assetTypeCache = new Map<string, string>()
  const brandCache = new Map<string, string>()
  const modelCache = new Map<string, string>()
  const locationCache = new Map<string, string>()
  const personCache = new Map<string, string>()

  async function resolveId(
    value: string | undefined,
    cache: Map<string, string>,
    lookup: (name: string) => Promise<string | null>
  ): Promise<string | null> {
    if (!value || value.trim() === '') return null
    const v = value.trim()
    if (isUuid(v)) return v
    if (cache.has(v)) return cache.get(v)!
    const id = await lookup(v)
    if (id) cache.set(v, id)
    return id
  }

  let successCount = 0
  const errors: { row: number; field: string; message: string }[] = []

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    const rowNum = i + 2 // 1-indexed + header

    try {
      // Required field: assetTag
      if (!row.assetTag || row.assetTag.trim() === '') {
        errors.push({ row: rowNum, field: 'assetTag', message: 'assetTag es requerido' })
        continue
      }

      const assetTag = row.assetTag.trim()

      // Check uniqueness
      const existing = await prisma.asset.findFirst({ where: { assetTag, deletedAt: null } })
      if (existing) {
        errors.push({ row: rowNum, field: 'assetTag', message: `El tag '${assetTag}' ya existe` })
        continue
      }

      // Status/condition
      const status = row.status?.trim().toUpperCase() || 'AVAILABLE'
      if (!VALID_STATUSES.includes(status)) {
        errors.push({ row: rowNum, field: 'status', message: `Estado inválido: '${row.status}'` })
        continue
      }

      const condition = row.condition?.trim().toUpperCase() || 'GOOD'
      if (!VALID_CONDITIONS.includes(condition)) {
        errors.push({ row: rowNum, field: 'condition', message: `Condición inválida: '${row.condition}'` })
        continue
      }

      // Resolve assetTypeId (required by schema)
      const assetTypeId = await resolveId(row.assetTypeId, assetTypeCache, async (name) => {
        const r = await prisma.assetType.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
        return r?.id ?? null
      })

      if (!assetTypeId) {
        errors.push({ row: rowNum, field: 'assetTypeId', message: `Tipo de activo '${row.assetTypeId || '(vacío)'}' no encontrado` })
        continue
      }

      const brandId = await resolveId(row.brandId, brandCache, async (name) => {
        const r = await prisma.brand.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
        return r?.id ?? null
      })

      const modelId = await resolveId(row.modelId, modelCache, async (name) => {
        const r = await prisma.model.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
        return r?.id ?? null
      })

      const locationId = await resolveId(row.locationId, locationCache, async (name) => {
        const r = await prisma.location.findFirst({ where: { site: { equals: name, mode: 'insensitive' }, deletedAt: null } })
        return r?.id ?? null
      })

      const assignedPersonId = await resolveId(row.assignedPersonId, personCache, async (name) => {
        const r = await prisma.person.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null } })
        return r?.id ?? null
      })

      // Date parsing
      function parseDate(val?: string): Date | undefined {
        if (!val || val.trim() === '') return undefined
        const d = new Date(val.trim())
        return isNaN(d.getTime()) ? undefined : d
      }

      await prisma.asset.create({
        data: {
          tenantId,
          assetTag,
          description: row.description?.trim() || null,
          serialNumber: row.serialNumber?.trim() || null,
          status: status as any,
          condition: condition as any,
          assetTypeId,
          brandId: brandId ?? null,
          modelId: modelId ?? null,
          locationId: locationId ?? null,
          assignedPersonId: assignedPersonId ?? null,
          hostname: row.hostname?.trim() || null,
          cpu: row.cpu?.trim() || null,
          ram: row.ram?.trim() || null,
          storageCapacity: row.storageCapacity?.trim() || null,
          os: row.os?.trim() || null,
          ipAddress: row.ipAddress?.trim() || null,
          macAddress: row.macAddress?.trim() || null,
          warrantyExpiresAt: parseDate(row.warrantyExpiresAt),
          eolDate: parseDate(row.eolDate),
        },
      })

      successCount++
    } catch (e: any) {
      errors.push({ row: rowNum, field: 'general', message: e.message ?? 'Error desconocido' })
    }
  }

  return NextResponse.json({ success: successCount, errors })
}
