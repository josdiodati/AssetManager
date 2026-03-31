import { getAssetTypes } from '@/lib/actions/asset-types'
import { getActiveAssetCategories } from '@/lib/actions/config'
import { AssetTypesClient } from './asset-types-client'

export default async function AssetTypesPage() {
  const [assetTypes, categories] = await Promise.all([
    getAssetTypes(),
    getActiveAssetCategories(),
  ])
  return <AssetTypesClient assetTypes={assetTypes as any} categories={categories} />
}
