import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Bell, UserCheck, UserMinus, CheckCircle, XCircle, Upload, Package, Users, ShieldCheck } from 'lucide-react'

const ACTION_META: Record<string, { label: string; icon: any; color: string }> = {
  asset_created:              { label: 'Activo creado',              icon: Package,     color: 'bg-blue-100 text-blue-600' },
  asset_updated:              { label: 'Activo actualizado',         icon: Package,     color: 'bg-gray-100 text-gray-600' },
  asset_assigned:             { label: 'Activo asignado',            icon: UserCheck,   color: 'bg-indigo-100 text-indigo-600' },
  asset_unassigned:           { label: 'Activo desasignado',         icon: UserMinus,   color: 'bg-orange-100 text-orange-600' },
  acceptance_token_generated: { label: 'Email de aceptación enviado',icon: Bell,        color: 'bg-purple-100 text-purple-600' },
  acceptance_accepted:        { label: 'Aceptación confirmada',      icon: CheckCircle, color: 'bg-green-100 text-green-600' },
  acceptance_declined:        { label: 'Aceptación rechazada',       icon: XCircle,     color: 'bg-red-100 text-red-600' },
  approval_approved:          { label: 'Aprobación aprobada',        icon: ShieldCheck, color: 'bg-green-100 text-green-600' },
  approval_rejected:          { label: 'Aprobación rechazada',       icon: XCircle,     color: 'bg-red-100 text-red-600' },
  import_completed:           { label: 'Importación completada',     icon: Upload,      color: 'bg-teal-100 text-teal-600' },
  person_created:             { label: 'Persona creada',             icon: Users,       color: 'bg-blue-100 text-blue-600' },
}

const PRIORITY_ACTIONS = new Set([
  'acceptance_accepted', 'acceptance_declined',
  'approval_approved', 'approval_rejected',
  'asset_assigned', 'asset_unassigned',
  'acceptance_token_generated', 'import_completed',
])

function formatRelative(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  if (hours < 24) return `hace ${hours}h`
  if (days < 7) return `hace ${days}d`
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const { role, tenantId: userTenantId, activeTenantId } = session.user

  const where: any = {
    action: { in: Array.from(PRIORITY_ACTIONS) },
  }
  if (role === 'SUPER_ADMIN') {
    // no filter
  } else if (role === 'INTERNAL_ADMIN') {
    where.tenantId = activeTenantId
  } else {
    where.tenantId = userTenantId
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { name: true } },
      tenant: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Resolve entity names
  const assetIds = logs.filter(l => l.entityType === 'asset').map(l => l.entityId)
  const personIds = logs.filter(l => l.entityType === 'person').map(l => l.entityId)

  const [assets, persons] = await Promise.all([
    assetIds.length ? prisma.asset.findMany({ where: { id: { in: assetIds } }, select: { id: true, assetTag: true } }) : [],
    personIds.length ? prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, name: true } }) : [],
  ])

  const entityNames: Record<string, string> = {}
  for (const a of assets) entityNames[a.id] = a.assetTag
  for (const p of persons) entityNames[p.id] = p.name

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-muted-foreground mt-1">Últimos {logs.length} eventos relevantes</p>
        </div>
      </div>

      {logs.length === 0 && (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>No hay notificaciones aún</p>
        </div>
      )}

      <div className="space-y-2">
        {logs.map((log) => {
          const meta = ACTION_META[log.action] ?? { label: log.action, icon: Bell, color: 'bg-gray-100 text-gray-600' }
          const Icon = meta.icon
          const entityName = entityNames[log.entityId]
          const isAsset = log.entityType === 'asset'
          const afterData = log.afterData as any

          // Build description line
          let description = ''
          if (log.action === 'acceptance_accepted' || log.action === 'acceptance_declined') {
            const personId = afterData?.personId
            description = entityName ? `Activo ${entityName}` : ''
          } else if (log.action === 'asset_assigned') {
            description = entityName ? `Activo ${entityName}` : ''
            if (afterData?.personName) description += ` → ${afterData.personName}`
          } else if (log.action === 'asset_unassigned') {
            description = entityName ? `Activo ${entityName}` : ''
          } else if (log.action === 'acceptance_token_generated') {
            description = entityName ? `Activo ${entityName}` : ''
            if (afterData?.sentTo) description += ` — enviado a ${afterData.sentTo}`
          } else if (log.action === 'import_completed') {
            description = afterData?.success ? `${afterData.success} activos importados` : ''
          } else if (entityName) {
            description = entityName
          }

          return (
            <div key={log.id} className="flex items-start gap-4 p-4 bg-white border rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${meta.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                    {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {log.user && <span className="text-xs text-gray-400">por {log.user.name}</span>}
                      {role === 'SUPER_ADMIN' && log.tenant && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{log.tenant.name}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {formatRelative(new Date(log.createdAt))}
                  </span>
                </div>
                {isAsset && log.entityId && (
                  <Link href={`/assets/${log.entityId}`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                    Ver activo →
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
