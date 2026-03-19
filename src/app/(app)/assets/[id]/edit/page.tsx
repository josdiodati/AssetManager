import { getAsset } from '@/lib/actions/assets'
import { getAssetTypes } from '@/lib/actions/asset-types'
import { getBrandsWithModels } from '@/lib/actions/brands'
import { getLocations } from '@/lib/actions/locations'
import { getTenants } from '@/lib/actions/tenants'
import { getMonitoringZones, getAssetMonitoring } from '@/lib/actions/monitoring'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { AssetForm } from '../../asset-form'
import { format } from 'date-fns'

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (session?.user.role === 'CLIENT_ADMIN') redirect('/assets')

  try {
    const asset = await getAsset(id)
    const tenantId = asset.tenantId

    const [assetTypes, brands, locations, tenants, monitoringZones, assetMonitoring] = await Promise.all([
      getAssetTypes(tenantId),
      getBrandsWithModels(),
      getLocations(tenantId),
      session?.user.role === 'SUPER_ADMIN' ? getTenants() : Promise.resolve([]),
      getMonitoringZones(tenantId),
      getAssetMonitoring(id),
    ])

    const initialData = {
      tenantId: asset.tenantId,
      assetTypeId: asset.assetTypeId,
      condition: asset.condition,
      brandId: asset.brandId ?? '',
      modelId: asset.modelId ?? '',
      serialNumber: asset.serialNumber ?? '',
      description: asset.description ?? '',
      locationId: asset.locationId ?? '',
      requiresApproval: asset.requiresApproval,
      hostname: asset.hostname ?? '',
      os: asset.os ?? '',
      cpu: asset.cpu ?? '',
      ram: asset.ram ?? '',
      storageCapacity: asset.storageCapacity ?? '',
      ipAddress: asset.ipAddress ?? '',
      macAddress: asset.macAddress ?? '',
      firmwareVersion: asset.firmwareVersion ?? '',
      antivirus: asset.antivirus ?? '',
      warrantyExpiresAt: asset.warrantyExpiresAt ? format(asset.warrantyExpiresAt, 'yyyy-MM-dd') : '',
      eolDate: asset.eolDate ? format(asset.eolDate, 'yyyy-MM-dd') : '',
      providerName: asset.providerName ?? '',
      providerTaxId: asset.providerTaxId ?? '',
      invoiceNumber: asset.invoiceNumber ?? '',
      invoiceDate: asset.invoiceDate ? format(asset.invoiceDate, 'yyyy-MM-dd') : '',
    }

    return (
      <AssetForm
        mode="edit"
        assetId={id}
        assetTypes={assetTypes}
        brands={brands}
        locations={locations}
        tenants={tenants}
        defaultTenantId={tenantId}
        currentRole={session?.user.role ?? ''}
        initialData={initialData}
        monitoringZones={monitoringZones}
        assetMonitoring={assetMonitoring}
      />
    )
  } catch {
    notFound()
  }
}
