/**
 * Shared monitoring utility functions (pure, no server directive)
 */

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' | 'DISABLED'

export function getSeverityName(severity: number): string {
  const names = ["Not classified", "Information", "Warning", "Average", "High", "Disaster"]
  return names[severity] ?? "Unknown"
}

export function getHealthColor(health: HealthStatus): string {
  switch (health) {
    case 'HEALTHY': return 'text-green-600'
    case 'WARNING': return 'text-yellow-600'
    case 'CRITICAL': return 'text-red-600'
    case 'UNKNOWN': return 'text-gray-400'
    case 'DISABLED': return 'text-gray-600'
    default: return 'text-gray-400'
  }
}

export function getSeverityBadgeClass(severity: number): string {
  switch (severity) {
    case 0: return 'bg-gray-100 text-gray-800'
    case 1: return 'bg-blue-100 text-blue-800'
    case 2: return 'bg-yellow-100 text-yellow-800'
    case 3: return 'bg-orange-100 text-orange-800'
    case 4: return 'bg-red-100 text-red-800'
    case 5: return 'bg-red-200 text-red-900 font-bold'
    default: return 'bg-gray-100 text-gray-800'
  }
}
