import { getAcceptancePageData } from '@/lib/actions/acceptance'
import { AcceptanceClient } from './acceptance-client'

export default async function AcceptancePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getAcceptancePageData(token)
  return <AcceptanceClient data={data} token={token} />
}
