'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { upsertMonitoringIntegration } from '@/lib/actions/monitoring'
import { toast } from 'sonner'
import Link from 'next/link'
import { Activity, Globe, BarChart3, MapPin, FileStack } from 'lucide-react'

type Integration = {
  id: string; tenantId: string; zabbixUrl: string; zabbixApiToken: string;
  zabbixHostGroupId: string | null; zabbixHostGroupName: string | null;
  grafanaUrl: string | null; grafanaOrgId: number | null;
  grafanaApiToken: string | null; grafanaDashboardUid: string | null;
  enabled: boolean;
} | null

type Tenant = { id: string; name: string }

export function MonitoringConfigClient({ integration, tenants, defaultTenantId, currentRole }: {
  integration: Integration; tenants: Tenant[]; defaultTenantId: string; currentRole: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState(defaultTenantId)
  const [form, setForm] = useState({
    zabbixUrl: integration?.zabbixUrl ?? '',
    zabbixApiToken: integration?.zabbixApiToken ?? '',
    zabbixHostGroupId: integration?.zabbixHostGroupId ?? '',
    zabbixHostGroupName: integration?.zabbixHostGroupName ?? '',
    grafanaUrl: integration?.grafanaUrl ?? '',
    grafanaOrgId: integration?.grafanaOrgId?.toString() ?? '',
    grafanaApiToken: integration?.grafanaApiToken ?? '',
    enabled: integration?.enabled ?? true,
  })

  async function handleSave() {
    if (!selectedTenant) { toast.error('Seleccioná un cliente'); return }
    if (!form.zabbixUrl) { toast.error('Zabbix URL es requerida'); return }
    if (!form.zabbixApiToken) { toast.error('Zabbix API Token es requerido'); return }
    setLoading(true)
    try {
      await upsertMonitoringIntegration(selectedTenant, {
        zabbixUrl: form.zabbixUrl,
        zabbixApiToken: form.zabbixApiToken,
        zabbixHostGroupId: form.zabbixHostGroupId || undefined,
        zabbixHostGroupName: form.zabbixHostGroupName || undefined,
        grafanaUrl: form.grafanaUrl || undefined,
        grafanaOrgId: form.grafanaOrgId ? parseInt(form.grafanaOrgId) : undefined,
        grafanaApiToken: form.grafanaApiToken || undefined,
        enabled: form.enabled,
      })
      toast.success('Configuración de monitoreo guardada')
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Monitoreo</h1>
          {integration?.enabled && <Badge className="bg-green-100 text-green-800">Activo</Badge>}
          {integration && !integration.enabled && <Badge variant="secondary">Deshabilitado</Badge>}
          {!integration && <Badge variant="outline">No configurado</Badge>}
        </div>
        <p className="text-muted-foreground mt-1">Integración con Zabbix y Grafana</p>
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link href="/admin/monitoring/zones">
          <Button variant="outline" size="sm"><MapPin className="h-4 w-4 mr-2" />Monitoreadores</Button>
        </Link>
        <Link href="/admin/monitoring/templates">
          <Button variant="outline" size="sm"><FileStack className="h-4 w-4 mr-2" />Templates</Button>
        </Link>
      </div>

      {currentRole === 'SUPER_ADMIN' && tenants.length > 0 && (
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={selectedTenant} onValueChange={v => { setSelectedTenant(v); router.push(`/admin/monitoring?tenantId=${v}`) }}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
            <SelectContent>
              {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Zabbix Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />Zabbix Server
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>URL del Zabbix Server *</Label>
              <Input value={form.zabbixUrl} onChange={e => setForm(f => ({ ...f, zabbixUrl: e.target.value }))} placeholder="https://zabbix.example.com" />
            </div>
            <div className="space-y-2">
              <Label>API Token *</Label>
              <Input type="password" value={form.zabbixApiToken} onChange={e => setForm(f => ({ ...f, zabbixApiToken: e.target.value }))} placeholder="Token de autenticación" />
            </div>
            <div className="space-y-2">
              <Label>Host Group Name</Label>
              <Input value={form.zabbixHostGroupName} onChange={e => setForm(f => ({ ...f, zabbixHostGroupName: e.target.value }))} placeholder="ej: Cliente ACME" />
            </div>
            <div className="space-y-2">
              <Label>Host Group ID</Label>
              <Input value={form.zabbixHostGroupId} onChange={e => setForm(f => ({ ...f, zabbixHostGroupId: e.target.value }))} placeholder="Auto-detectado al conectar" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grafana Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />Grafana
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>URL de Grafana</Label>
              <Input value={form.grafanaUrl} onChange={e => setForm(f => ({ ...f, grafanaUrl: e.target.value }))} placeholder="https://grafana.example.com" />
            </div>
            <div className="space-y-2">
              <Label>API Token</Label>
              <Input type="password" value={form.grafanaApiToken} onChange={e => setForm(f => ({ ...f, grafanaApiToken: e.target.value }))} placeholder="Token de Grafana" />
            </div>
            <div className="space-y-2">
              <Label>Org ID</Label>
              <Input value={form.grafanaOrgId} onChange={e => setForm(f => ({ ...f, grafanaOrgId: e.target.value }))} placeholder="1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toggle + Save */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="enabled" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} className="rounded" />
          <Label htmlFor="enabled">Integración habilitada</Label>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  )
}
