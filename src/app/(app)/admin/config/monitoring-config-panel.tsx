'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { reloadMonitoringYaml } from '@/lib/actions/monitoring-config'
import { toast } from 'sonner'

type SyncResult = {
  configPath: string
  results: Array<{ tenant: string; integrationId?: string; zones: number }>
}

export function MonitoringConfigPanel({
  configPath,
  version,
  rawYaml,
  syncResult,
}: {
  configPath: string
  version: number
  rawYaml: string
  syncResult: SyncResult
}) {
  const [loading, setLoading] = useState(false)

  async function handleReload() {
    setLoading(true)
    try {
      const result = await reloadMonitoringYaml()
      toast.success(`YAML recargado. Tenants sincronizados: ${result.results.length}`)
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message || 'Error recargando YAML')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-lg border bg-card p-4 space-y-3'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h2 className='font-semibold'>Configuración YAML de monitoreo</h2>
            <p className='text-sm text-muted-foreground'>Ruta: <code>{configPath}</code></p>
            <p className='text-sm text-muted-foreground'>Versión: {version}</p>
          </div>
          <Button onClick={handleReload} disabled={loading}>
            {loading ? 'Recargando...' : 'Recargar YAML'}
          </Button>
        </div>
        <p className='text-sm text-muted-foreground'>
          Esta configuración reemplaza la carga manual de integraciones, proxies y monitoreadores desde la UI.
          Editá el archivo en el servidor y usá este botón para sincronizar sin reiniciar la aplicación.
        </p>
      </div>

      <div className='rounded-lg border bg-card p-4 space-y-3'>
        <h3 className='font-semibold'>Resultado de sincronización</h3>
        <ul className='list-disc pl-5 text-sm space-y-1'>
          {syncResult.results.map((r) => (
            <li key={r.tenant}><strong>{r.tenant}</strong>: integración OK, monitoreadores declarados: {r.zones}</li>
          ))}
        </ul>
      </div>

      <div className='rounded-lg border bg-card p-4 space-y-3'>
        <h3 className='font-semibold'>Cómo poblar el archivo</h3>
        <ol className='list-decimal pl-5 text-sm space-y-1 text-muted-foreground'>
          <li>Definí el tenant por <code>databaseId</code> o por nombre exacto.</li>
          <li>Definí la ubicación por <code>databaseId</code> o por <code>site</code> + <code>area</code>.</li>
          <li>Completá <code>zabbixProxy.name</code>, <code>zabbixProxy.id</code>, <code>wireguard.endpoint</code> y <code>wireguard.publicKey</code>.</li>
          <li>Guardá el YAML y usá <strong>Recargar YAML</strong>.</li>
        </ol>
      </div>

      <div className='rounded-lg border bg-card p-4 space-y-3'>
        <h3 className='font-semibold'>Contenido actual</h3>
        <pre className='overflow-x-auto rounded bg-slate-950 text-slate-100 p-4 text-xs leading-5'>{rawYaml}</pre>
      </div>
    </div>
  )
}
