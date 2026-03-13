import { getAssetTypes } from '@/lib/actions/asset-types'
import { getAssetTypeMasters, getActiveAssetCategories } from '@/lib/actions/config'
import { AssetTypesClient } from './asset-types-client'

export default async function AssetTypesPage() {
  const [assetTypes, typeNames, categories] = await Promise.all([
    getAssetTypes(),
    getAssetTypeMasters(),
    getActiveAssetCategories(),
  ])
  return <AssetTypesClient assetTypes={assetTypes as any} typeNames={typeNames} categories={categories} />
}
