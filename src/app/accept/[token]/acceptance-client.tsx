'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { submitAcceptance } from '@/lib/actions/acceptance'
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'

type PageData =
  | { status: 'not_found' }
  | { status: 'already_used' }
  | { status: 'expired' }
  | {
      status: 'valid'
      record: {
        token: string
        expiresAt: Date
        asset: {
          assetTag: string
          serialNumber: string | null
          description: string | null
          condition: string
          hostname: string | null
          os: string | null
          cpu: string | null
          ram: string | null
          storageCapacity: string | null
          assetType: { name: string; category: string } | null
          brand: { name: string } | null
          model: { name: string } | null
          location: { site: string; area: string | null; detail: string | null } | null
          assignedPerson: { name: string; email: string; area: string | null; position: string | null } | null
        }
      }
    }

const conditionLabels: Record<string, string> = {
  NEW: 'Nuevo', GOOD: 'Bueno', FAIR: 'Regular', POOR: 'Malo',
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

export function AcceptanceClient({ data, token }: { data: PageData; token: string }) {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [result, setResult] = useState<'accepted' | 'declined' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (data.status === 'not_found') {
    return <ErrorPage icon={<AlertCircle className="h-12 w-12 text-gray-400" />} title="Enlace no válido" message="Este enlace de aceptación no existe o fue eliminado." />
  }
  if (data.status === 'expired') {
    return <ErrorPage icon={<Clock className="h-12 w-12 text-orange-400" />} title="Enlace expirado" message="Este enlace de aceptación ha expirado. Solicitá uno nuevo a tu área de IT." />
  }
  if (data.status === 'already_used') {
    return <ErrorPage icon={<CheckCircle className="h-12 w-12 text-green-500" />} title="Enlace ya utilizado" message="Ya respondiste a esta solicitud de aceptación. Si tenés dudas, contactá a tu área de IT." />
  }

  if (result === 'accepted') {
    return (
      <SuccessPage
        icon={<CheckCircle className="h-16 w-16 text-green-500" />}
        title="¡Recepción confirmada!"
        message={`Confirmaste la recepción del activo ${data.record.asset.assetTag}. Gracias.`}
      />
    )
  }

  if (result === 'declined') {
    return (
      <SuccessPage
        icon={<XCircle className="h-16 w-16 text-red-400" />}
        title="Recepción rechazada"
        message={`Rechazaste la recepción del activo ${data.record.asset.assetTag}. Tu área de IT fue notificada.`}
      />
    )
  }

  const { asset } = data.record

  async function handleAction(action: 'accept' | 'decline') {
    setLoading(action)
    setError(null)
    try {
      await submitAcceptance(token, action)
      setResult(action === 'accept' ? 'accepted' : 'declined')
    } catch (e: any) {
      setError(e.message ?? 'Error al procesar la solicitud')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Confirmación de activo</h1>
          <p className="text-gray-500 mt-2">
            Hola <strong className="text-gray-700">{asset.assignedPerson?.name}</strong>, confirmá la recepción del siguiente activo:
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="font-mono text-lg">{asset.assetTag}</span>
              <span className="text-sm font-normal text-gray-500">{asset.assetType?.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca" value={asset.brand?.name} />
              <Field label="Modelo" value={asset.model?.name} />
              <Field label="N° Serie" value={asset.serialNumber} />
              <Field label="Condición" value={conditionLabels[asset.condition] ?? asset.condition} />
              {asset.location && (
                <Field
                  label="Ubicación"
                  value={`${asset.location.site}${asset.location.area ? ` / ${asset.location.area}` : ''}${asset.location.detail ? ` / ${asset.location.detail}` : ''}`}
                />
              )}
              <Field label="Descripción" value={asset.description} />
              <Field label="Hostname" value={asset.hostname} />
              <Field label="Sistema Operativo" value={asset.os} />
              <Field label="CPU" value={asset.cpu} />
              <Field label="RAM" value={asset.ram} />
              <Field label="Almacenamiento" value={asset.storageCapacity} />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={!!loading}
            onClick={() => handleAction('accept')}
          >
            {loading === 'accept' ? 'Confirmando...' : '✓ Confirmar recepción'}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
            disabled={!!loading}
            onClick={() => handleAction('decline')}
          >
            {loading === 'decline' ? 'Procesando...' : '✗ No recibí este activo'}
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Este enlace expira el {new Date(data.record.expiresAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

function ErrorPage({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-4">{icon}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  )
}

function SuccessPage({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-4">{icon}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  )
}
