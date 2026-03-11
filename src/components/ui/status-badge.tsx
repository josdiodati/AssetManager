import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  IN_REPAIR: 'bg-orange-100 text-orange-800',
  ON_LOAN: 'bg-purple-100 text-purple-800',
  OBSOLETE: 'bg-gray-100 text-gray-600',
  LOST: 'bg-red-100 text-red-800',
  STOLEN: 'bg-red-200 text-red-900',
  DECOMMISSIONED: 'bg-gray-200 text-gray-700',
}

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Disponible',
  ASSIGNED: 'Asignado',
  PENDING_APPROVAL: 'Pend. Aprobación',
  IN_REPAIR: 'En Reparación',
  ON_LOAN: 'En Préstamo',
  OBSOLETE: 'Obsoleto',
  LOST: 'Perdido',
  STOLEN: 'Robado',
  DECOMMISSIONED: 'Dado de Baja',
}

const conditionLabels: Record<string, string> = {
  NEW: 'Nuevo',
  GOOD: 'Bueno',
  FAIR: 'Regular',
  POOR: 'Malo',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', statusStyles[status] ?? 'bg-gray-100 text-gray-600')}>
      {statusLabels[status] ?? status}
    </span>
  )
}

export function ConditionBadge({ condition }: { condition: string }) {
  const styles: Record<string, string> = {
    NEW: 'bg-emerald-100 text-emerald-800',
    GOOD: 'bg-blue-100 text-blue-800',
    FAIR: 'bg-yellow-100 text-yellow-800',
    POOR: 'bg-red-100 text-red-800'
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', styles[condition] ?? 'bg-gray-100 text-gray-600')}>
      {conditionLabels[condition] ?? condition}
    </span>
  )
}
