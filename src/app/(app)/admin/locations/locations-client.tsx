'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/ui/data-table'
import { ModalForm } from '@/components/ui/modal-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createLocation, updateLocation, deleteLocation } from '@/lib/actions/locations'
import { toast } from 'sonner'

type Location = { id: string; site: string; area: string | null; detail: string | null; active: boolean }
type Tenant = { id: string; name: string }

export function LocationsClient({ locations, tenants, defaultTenantId, currentRole }: {
  locations: Location[]; tenants: Tenant[]; defaultTenantId: string; currentRole: string
}) {
  const router = useRouter()
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; loc?: Location } | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ site: '', area: '', detail: '', tenantId: defaultTenantId })

  function openCreate() { setForm({ site: '', area: '', detail: '', tenantId: defaultTenantId }); setModal({ mode: 'create' }) }
  function openEdit(l: Location) { setForm({ site: l.site, area: l.area ?? '', detail: l.detail ?? '', tenantId: defaultTenantId }); setModal({ mode: 'edit', loc: l }) }

  async function handleSubmit() {
    setLoading(true)
    try {
      if (modal?.mode === 'create') {
        await createLocation({ tenantId: form.tenantId || defaultTenantId, site: form.site, area: form.area || undefined, detail: form.detail || undefined })
        toast.success('Ubicación creada')
      } else if (modal?.loc) {
        await updateLocation(modal.loc.id, { site: form.site, area: form.area || undefined, detail: form.detail || undefined })
        toast.success('Ubicación actualizada')
      }
      setModal(null)
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta ubicación?')) return
    try { await deleteLocation(id); toast.success('Ubicación eliminada'); router.refresh() }
    catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ubicaciones</h1>
          <p className="text-muted-foreground mt-1">Sedes y áreas de los clientes</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nueva Ubicación</Button>
      </div>
      <DataTable
        data={locations}
        searchKeys={['site', 'area']}
        searchPlaceholder="Buscar ubicación..."
        columns={[
          { key: 'site', header: 'Sede' },
          { key: 'area', header: 'Área', render: r => r.area ?? '—' },
          { key: 'detail', header: 'Detalle', render: r => r.detail ?? '—' },
          { key: 'active', header: 'Estado', render: r => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{r.active ? 'Activa' : 'Inactiva'}</span> },
        ]}
        actions={l => (
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(l.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />
      <ModalForm open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nueva Ubicación' : 'Editar Ubicación'} onSubmit={handleSubmit} loading={loading}>
        {currentRole === 'SUPER_ADMIN' && modal?.mode === 'create' && tenants.length > 0 && (
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={form.tenantId} onValueChange={v => setForm(f => ({ ...f, tenantId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>{tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Sede *</Label>
          <Input value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} placeholder="Oficina Central" />
        </div>
        <div className="space-y-2">
          <Label>Área</Label>
          <Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="IT, RRHH, etc." />
        </div>
        <div className="space-y-2">
          <Label>Detalle</Label>
          <Input value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="Piso 2, Sala B, etc." />
        </div>
      </ModalForm>
    </div>
  )
}
