'use client'
import Link from 'next/link'
import { AlertTriangle, Clock, Cpu } from 'lucide-react'

interface AlertAsset {
  id: string
  assetTag: string
  warrantyExpiresAt?: Date | string | null
  eolDate?: Date | string | null
  status: string
  assetType: { name: string }
  assignedPerson: { name: string } | null
  tenant: { name: string }
}

interface AlertsData {
  expiringSoon: AlertAsset[]
  eolSoon: AlertAsset[]
  expired: AlertAsset[]
}

function daysFrom(date: Date | string | null | undefined): number {
  if (!date) return 0
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function AssetTable({
  assets,
  dateField,
  labelDate,
  labelDays,
  expired = false,
}: {
  assets: AlertAsset[]
  dateField: 'warrantyExpiresAt' | 'eolDate'
  labelDate: string
  labelDays: string
  expired?: boolean
}) {
  if (assets.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Sin alertas en esta categoría</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Tag</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Tipo</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Asignado a</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">{labelDate}</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">{labelDays}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {assets.map((asset) => {
            const days = daysFrom(asset[dateField])
            return (
              <tr key={asset.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/assets/${asset.id}`} className="font-mono font-medium text-blue-600 hover:underline">
                    {asset.assetTag}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-700">{asset.assetType.name}</td>
                <td className="px-4 py-2 text-gray-600">{asset.assignedPerson?.name ?? '—'}</td>
                <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{formatDate(asset[dateField])}</td>
                <td className="px-4 py-2">
                  {expired ? (
                    <span className="text-red-600 font-medium">{Math.abs(days)} días vencido</span>
                  ) : (
                    <span className={days <= 7 ? 'text-red-600 font-medium' : 'text-orange-600 font-medium'}>
                      {days} día{days !== 1 ? 's' : ''}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function AlertsClient({ alerts }: { alerts: AlertsData }) {
  const { expiringSoon, eolSoon, expired } = alerts
  const total = expiringSoon.length + eolSoon.length + expired.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
        <span className="text-sm text-muted-foreground">{total} alerta{total !== 1 ? 's' : ''} activa{total !== 1 ? 's' : ''}</span>
      </div>

      {total === 0 && (
        <div className="border rounded-lg p-8 text-center text-muted-foreground bg-white">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-green-500" />
          No hay alertas activas. ¡Todo en orden!
        </div>
      )}

      {/* Expiring Soon — Yellow */}
      <div className="bg-white border border-yellow-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 border-b border-yellow-200">
          <Clock className="h-5 w-5 text-yellow-600" />
          <h2 className="font-semibold text-yellow-800">Garantía por vencer</h2>
          <span className="ml-auto bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
            {expiringSoon.length}
          </span>
          <span className="text-xs text-yellow-600">próximos 30 días</span>
        </div>
        <div className="p-4">
          <AssetTable
            assets={expiringSoon}
            dateField="warrantyExpiresAt"
            labelDate="Vence el"
            labelDays="Días restantes"
          />
        </div>
      </div>

      {/* EOL Soon — Orange */}
      <div className="bg-white border border-orange-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border-b border-orange-200">
          <Cpu className="h-5 w-5 text-orange-600" />
          <h2 className="font-semibold text-orange-800">Fin de vida (EOL) próximo</h2>
          <span className="ml-auto bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">
            {eolSoon.length}
          </span>
          <span className="text-xs text-orange-600">próximos 60 días</span>
        </div>
        <div className="p-4">
          <AssetTable
            assets={eolSoon}
            dateField="eolDate"
            labelDate="EOL el"
            labelDays="Días restantes"
          />
        </div>
      </div>

      {/* Expired — Red */}
      <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-b border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="font-semibold text-red-800">Garantía vencida</h2>
          <span className="ml-auto bg-red-200 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full">
            {expired.length}
          </span>
          <span className="text-xs text-red-600">activos sin renovar</span>
        </div>
        <div className="p-4">
          <AssetTable
            assets={expired}
            dateField="warrantyExpiresAt"
            labelDate="Venció el"
            labelDays="Vencido hace"
            expired
          />
        </div>
      </div>
    </div>
  )
}
