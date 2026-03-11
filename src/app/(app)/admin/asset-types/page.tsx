import { getAssetTypes } from '@/lib/actions/asset-types'
import { getAssetTypeMasters } from '@/lib/actions/config'
import { AssetTypesClient } from './asset-types-client'

export default async function AssetTypesPage() {
  const [assetTypes, typeNames] = await Promise.all([
    getAssetTypes(),
    getAssetTypeMasters(),
  ])
  return <AssetTypesClient assetTypes={assetTypes} typeNames={typeNames} />
}
