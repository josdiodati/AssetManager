import { getBrandsWithModels } from '@/lib/actions/brands'
import { BrandsClient } from './brands-client'

export default async function BrandsPage() {
  const brands = await getBrandsWithModels()
  return <BrandsClient brands={brands} />
}
