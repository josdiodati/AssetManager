import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  ASSIGNED: 'Asignado',
  IN_REPAIR: 'En reparación',
  DECOMMISSIONED: 'Desafectado',
  OBSOLETE: 'Obsoleto',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  AVAILABLE:      { bg: '#dcfce7', text: '#166534' },
  ASSIGNED:       { bg: '#dbeafe', text: '#1e40af' },
  IN_REPAIR:      { bg: '#ffedd5', text: '#9a3412' },
  DECOMMISSIONED: { bg: '#f3f4f6', text: '#374151' },
  OBSOLETE:       { bg: '#f1f5f9', text: '#475569' },
}

export default async function AssetPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const asset = await prisma.asset.findUnique({
    where: { qrToken: token },
    include: {
      assetType:      { select: { name: true } },
      brand:          { select: { name: true } },
      model:          { select: { name: true } },
      location:       { select: { site: true, area: true } },
      assignedPerson: { select: { name: true, email: true, area: true, position: true } },
      tenant:         { select: { name: true } },
    },
  })

  if (!asset || asset.deletedAt) notFound()

  const statusLabel = STATUS_LABELS[asset.status] ?? asset.status
  const statusColor = STATUS_COLORS[asset.status] ?? { bg: '#f3f4f6', text: '#374151' }

  const subtitleParts = [asset.assetType?.name, asset.brand?.name, asset.model?.name].filter(Boolean)

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{asset.assetTag} — Inventario</title>
        <meta name="robots" content="noindex,nofollow" />
      </head>
      <body style={{ margin: 0, padding: '1rem', background: '#f3f4f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '480px', width: '100%', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ background: '#1e40af', padding: '1.5rem', color: 'white' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em' }}>{asset.assetTag}</div>
            {subtitleParts.length > 0 && (
              <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.25rem' }}>{subtitleParts.join(' · ')}</div>
            )}
            <span style={{ display: 'inline-block', marginTop: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: statusColor.bg, color: statusColor.text }}>
              {statusLabel}
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem' }}>

            {/* Asset info */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }}>Datos del equipo</div>
              {asset.tenant && <Row label="Cliente" value={asset.tenant.name} />}
              {asset.serialNumber && <Row label="N/S" value={asset.serialNumber} />}
              {asset.location && <Row label="Ubicación" value={asset.location.site + (asset.location.area ? ' / ' + asset.location.area : '')} />}
              {asset.cpu && <Row label="CPU" value={asset.cpu} />}
              {asset.ram && <Row label="RAM" value={asset.ram} />}
              {asset.os && <Row label="OS" value={asset.os} />}
            </div>

            {/* Assigned person */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }}>Asignado a</div>
              {asset.assignedPerson ? (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', padding: '0.875rem' }}>
                  <div style={{ fontWeight: 600, color: '#0369a1', fontSize: '0.9375rem' }}>{asset.assignedPerson.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#0284c7', marginTop: '0.25rem' }}>{asset.assignedPerson.email}</div>
                  {(asset.assignedPerson.position || asset.assignedPerson.area) && (
                    <div style={{ fontSize: '0.8125rem', color: '#0284c7', opacity: 0.8, marginTop: '0.125rem' }}>
                      {[asset.assignedPerson.position, asset.assignedPerson.area].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.875rem', color: '#6b7280', fontSize: '0.875rem', textAlign: 'center' }}>
                  Sin asignación actual
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '1rem 1.5rem', background: '#f9fafb', borderTop: '1px solid #e5e7eb', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
            {asset.tenant?.name} · Inventario de Activos
          </div>
        </div>
      </body>
    </html>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.375rem' }}>
      <span style={{ fontSize: '0.8125rem', color: '#6b7280', minWidth: '90px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.8125rem', color: '#111827', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
