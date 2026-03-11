import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAssetTypes } from '@/lib/actions/asset-types'
import { getBrandsWithModels } from '@/lib/actions/brands'
import { getLocations } from '@/lib/actions/locations'
import { getTenants } from '@/lib/actions/tenants'
import { AssetForm } from '../asset-form'

export default async function NewAssetPage() {
  const session = await auth()
  if (session?.user.role === 'CLIENT_ADMIN') redirect('/assets')

  const tenantId = session?.user.activeTenantId ?? ''
  const [assetTypes, brands, locations, tenants] = await Promise.all([
    getAssetTypes(tenantId),
    getBrandsWithModels(),
    tenantId ? getLocations(tenantId) : Promise.resolve([]),
    session?.user.role === 'SUPER_ADMIN' ? getTenants() : Promise.resolve([]),
  ])

  return (
    <AssetForm
      mode="create"
      assetTypes={assetTypes}
      brands={brands}
      locations={locations}
      tenants={tenants}
      defaultTenantId={tenantId}
      currentRole={session?.user.role ?? ''}
    />
  )
}
