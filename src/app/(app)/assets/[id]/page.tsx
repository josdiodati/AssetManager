import { getAsset } from '@/lib/actions/assets'
import { getPersons } from '@/lib/actions/persons'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { AssetDetail } from './asset-detail'

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const asset = await getAsset(id)
    const session = await auth()
    const persons = await getPersons(asset.tenantId)
    return <AssetDetail asset={asset} currentRole={session?.user.role ?? ''} persons={persons} />
  } catch {
    notFound()
  }
}
