'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/ui/data-table'
import { ModalForm } from '@/components/ui/modal-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { createMonitoringZone, updateMonitoringZone, deleteMonitoringZone } from '@/lib/actions/monitoring'
import { toast } from 'sonner'
import Link from 'next/link'

type Zone = {
  id: string; name: string; zabbixProxyId: string | null; zabbixProxyName: string | null;
  wireguardEndpoint: string | null; wireguardPubKey: string | null; notes: string | null; active: boolean;
}
type Tenant = { id: string; name: string }

export function MonitoringZonesClient({ zones, tenants, defaultTenantId, currentRole }: {
  zones: Zone[]; tenants: Tenant[]; defaultTenantId: string; currentRole: string
}) {
  const router = useRouter()
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; zone?: Zone } | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState(defaultTenantId)
  const [form, setForm] = useState({
    name: '', zabbixProxyId: '', zabbixProxyName: '',
    wireguardEndpoint: '', wireguardPubKey: '', notes: '',
  })

  function openCreate() {
    setForm({ name: '', zabbixProxyId: '', zabbixProxyName: '', wireguardEndpoint: '', wireguardPubKey: '', notes: '' })
    setModal({ mode: 'create' })
  }
  function openEdit(z: Zone) {
    setForm({
      name: z.name,
      zabbixProxyId: z.zabbixProxyId ?? '',
      zabbixProxyName: z.zabbixProxyName ?? '',
      wireguardEndpoint: z.wireguardEndpoint ?? '',
      wireguardPubKey: z.wireguardPubKey ?? '',
      notes: z.notes ?? '',
    })
    setModal({ mode: 'edit', zone: z })
  }

  async function handleSubmit() {
    if (!form.name) { toast.error('Nombre es requerido'); return }
    if (!selectedTenant) { toast.error('Seleccioná un cliente'); return }
    setLoading(true)
    try {
      if (modal?.mode === 'create') {
        await createMonitoringZone(selectedTenant, {
          name: form.name,
          zabbixProxyId: form.zabbixProxyId || undefined,
          zabbixProxyName: form.zabbixProxyName || undefined,
          wireguardEndpoint: form.wireguardEndpoint || undefined,
          wireguardPubKey: form.wireguardPubKey || undefined,
          notes: form.notes || undefined,
        })
        toast.success('Zona creada')
      } else if (modal?.zone) {
        await updateMonitoringZone(modal.zone.id, {
          name: form.name,
          zabbixProxyId: form.zabbixProxyId || undefined,
          zabbixProxyName: form.zabbixProxyName || undefined,
          wireguardEndpoint: form.wireguardEndpoint || undefined,
          wireguardPubKey: form.wireguardPubKey || undefined,
          notes: form.notes || undefined,
        })
        toast.success('Zona actualizada')
      }
      setModal(null)
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar esta zona?')) return
    try { await deleteMonitoringZone(id); toast.success('Zona desactivada'); router.refresh() }
    catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/monitoring">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Monitoreo</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Zonas de Monitoreo</h1>
            <p className="text-muted-foreground mt-1">Sites con Zabbix Proxy conectados via WireGuard</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nueva Zona</Button>
      </div>

      {currentRole === 'SUPER_ADMIN' && tenants.length > 0 && (
        <div className="flex items-center gap-3">
          <Label className="shrink-0 text-sm">Cliente:</Label>
          <Select value={selectedTenant} onValueChange={v => { setSelectedTenant(v); router.push(`/admin/monitoring/zones?tenantId=${v}`) }}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <DataTable
        data={zones}
        searchKeys={['name', 'zabbixProxyName']}
        searchPlaceholder="Buscar zona..."
        columns={[
          { key: 'name', header: 'Nombre' },
          { key: 'zabbixProxyName', header: 'Zabbix Proxy', render: (r: Zone) => r.zabbixProxyName ?? '—' },
          { key: 'wireguardEndpoint', header: 'WireGuard', render: (r: Zone) => r.wireguardEndpoint ?? '—' },
          { key: 'notes', header: 'Notas', render: (r: Zone) => r.notes ?? '' },
        ]}
        actions={(z: Zone) => (
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => openEdit(z)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(z.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <ModalForm open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nueva Zona' : 'Editar Zona'} onSubmit={handleSubmit} loading={loading}>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sede Central, DC Norte..." autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Zabbix Proxy Name</Label>
              <Input value={form.zabbixProxyName} onChange={e => setForm(f => ({ ...f, zabbixProxyName: e.target.value }))} placeholder="proxy-cliente-sede1" />
            </div>
            <div className="space-y-2">
              <Label>Zabbix Proxy ID</Label>
              <Input value={form.zabbixProxyId} onChange={e => setForm(f => ({ ...f, zabbixProxyId: e.target.value }))} placeholder="Auto al conectar" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>WireGuard Endpoint</Label>
              <Input value={form.wireguardEndpoint} onChange={e => setForm(f => ({ ...f, wireguardEndpoint: e.target.value }))} placeholder="10.0.0.2:51820" />
            </div>
            <div className="space-y-2">
              <Label>WireGuard Public Key</Label>
              <Input value={form.wireguardPubKey} onChange={e => setForm(f => ({ ...f, wireguardPubKey: e.target.value }))} placeholder="Base64 key" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </ModalForm>
    </div>
  )
}
