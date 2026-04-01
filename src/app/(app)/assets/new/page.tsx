import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAssetTypes } from '@/lib/actions/asset-types'
import { getBrandsWithModels } from '@/lib/actions/brands'
import { getLocations } from '@/lib/actions/locations'
import { getTenants } from '@/lib/actions/tenants'
import { getMonitoringZones } from '@/lib/actions/monitoring'
import { AssetForm } from '../asset-form'
import { prisma } from '@/lib/prisma'

export default async function NewAssetPage() {
  const session = await auth()
  if (session?.user.role === 'CLIENT_ADMIN') redirect('/assets')

  const tenantId = session?.user.activeTenantId ?? ''
  const isSuperAdmin = session?.user.role === 'SUPER_ADMIN'

  const [assetTypes, brands, tenants, monitoringTemplates] = await Promise.all([
    getAssetTypes(tenantId),
    getBrandsWithModels(),
    isSuperAdmin ? getTenants() : Promise.resolve([]),
    prisma.monitoringTemplate.findMany({
      where: { active: true },
      orderBy: { assetTypeName: 'asc' },
      select: {
        id: true,
        assetTypeName: true,
        zabbixTemplateName: true,
        protocol: true,
        description: true,
      },
    }),
  ])

  const locations = isSuperAdmin
    ? await prisma.location.findMany({
        where: { active: true, deletedAt: null },
        orderBy: [{ site: 'asc' }, { area: 'asc' }],
        select: { id: true, site: true, area: true, detail: true, tenantId: true },
      })
    : tenantId
      ? await getLocations(tenantId)
      : []

  const monitoringZones = isSuperAdmin
    ? await prisma.monitoringZone.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        include: {
          location: { select: { id: true, site: true, area: true } },
          integration: { select: { tenantId: true } },
        },
      }).then(zones => zones.map(({ integration, ...zone }) => ({ ...zone, tenantId: integration.tenantId })))
    : tenantId
      ? await getMonitoringZones(tenantId)
      : []

  return (
    <AssetForm
      mode="create"
      assetTypes={assetTypes}
      brands={brands}
      locations={locations}
      tenants={tenants}
      defaultTenantId={tenantId}
      currentRole={session?.user.role ?? ''}
      monitoringZones={monitoringZones}
      monitoringTemplates={monitoringTemplates}
    />
  )
}
