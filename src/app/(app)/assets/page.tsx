import { auth } from '@/lib/auth'
import { getAssets } from '@/lib/actions/assets'
import { getAssetTypes } from '@/lib/actions/asset-types'
import { getTenants } from '@/lib/actions/tenants'
import { AssetsClient } from './assets-client'

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; assetTypeId?: string; search?: string; page?: string }>
}) {
  const session = await auth()
  const params = await searchParams
  const tenantId = session?.user.role === 'CLIENT_ADMIN' ? session.user.tenantId : session?.user.activeTenantId

  const { assets, total, page, pageSize } = await getAssets({
    tenantId: tenantId ?? undefined,
    status: params.status,
    assetTypeId: params.assetTypeId,
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
  })

  const assetTypes = await getAssetTypes(tenantId)
  const tenants = session?.user.role === 'SUPER_ADMIN' ? await getTenants() : []

  return (
    <AssetsClient
      assets={assets}
      total={total}
      page={page}
      pageSize={pageSize}
      assetTypes={assetTypes}
      tenants={tenants}
      currentRole={session?.user.role ?? ''}
      currentTenantId={tenantId ?? ''}
      filters={{ status: params.status, assetTypeId: params.assetTypeId, search: params.search }}
    />
  )
}
