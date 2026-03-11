import { getAssetTypes } from '@/lib/actions/asset-types'
import { AssetTypesClient } from './asset-types-client'

export default async function AssetTypesPage() {
  const assetTypes = await getAssetTypes()
  return <AssetTypesClient assetTypes={assetTypes} />
}
