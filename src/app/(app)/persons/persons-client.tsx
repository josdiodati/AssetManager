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
import { createPerson, updatePerson, deletePerson } from '@/lib/actions/persons'
import { toast } from 'sonner'

type Person = {
  id: string; name: string; email: string; area: string | null;
  position: string | null; active: boolean;
  location: { site: string; area: string | null } | null;
  tenant?: { name: string } | null;
}
type Location = { id: string; site: string; area: string | null; detail: string | null }
type Tenant = { id: string; name: string }

export function PersonsClient({ persons, locations, tenantId, currentRole, tenants = [], showTenantColumn = false }: {
  persons: Person[]; locations: Location[]; tenantId: string; currentRole: string;
  tenants?: Tenant[]; showTenantColumn?: boolean;
}) {
  const router = useRouter()
  const isSuperAdmin = currentRole === 'SUPER_ADMIN'
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; person?: Person } | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', area: '', position: '', locationId: '', notes: '',
    selectedTenantId: tenantId
  })

  const canEdit = currentRole !== 'CLIENT_ADMIN'

  function openCreate() {
    setForm({ name: '', email: '', area: '', position: '', locationId: '', notes: '', selectedTenantId: tenantId })
    setModal({ mode: 'create' })
  }
  function openEdit(p: Person) {
    setForm({ name: p.name, email: p.email, area: p.area ?? '', position: p.position ?? '', locationId: '', notes: '', selectedTenantId: tenantId })
    setModal({ mode: 'edit', person: p })
  }

  async function handleSubmit() {
    const effectiveTenantId = form.selectedTenantId || tenantId
    if (!effectiveTenantId) { toast.error('Selecciona un cliente'); return }
    setLoading(true)
    try {
      if (modal?.mode === 'create') {
        await createPerson({
          tenantId: effectiveTenantId,
          name: form.name,
          email: form.email,
          area: form.area || undefined,
          position: form.position || undefined,
          locationId: (form.locationId && form.locationId !== '__none__') ? form.locationId : undefined,
          notes: form.notes || undefined,
        })
        toast.success('Persona creada')
      } else if (modal?.person) {
        await updatePerson(modal.person.id, {
          name: form.name,
          email: form.email,
          area: form.area || undefined,
          position: form.position || undefined,
        })
        toast.success('Persona actualizada')
      }
      setModal(null)
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Desactivar esta persona?')) return
    try { await deletePerson(id); toast.success('Persona desactivada'); router.refresh() }
    catch (e: any) { toast.error(e.message) }
  }

  const columns: any[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'email', header: 'Email' },
    { key: 'area', header: 'Area', render: (r: Person) => r.area ?? '' },
    { key: 'position', header: 'Cargo', render: (r: Person) => r.position ?? '' },
    { key: 'location', header: 'Ubicacion', render: (r: Person) => r.location ? `${r.location.site}${r.location.area ? ` / ${r.location.area}` : ''}` : '' },
    ...(showTenantColumn ? [{ key: 'tenant', header: 'Cliente', render: (r: Person) => r.tenant?.name ?? '' }] : []),
    { key: 'active', header: 'Estado', render: (r: Person) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
        {r.active ? 'Activa' : 'Inactiva'}
      </span>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personas</h1>
          <p className="text-muted-foreground mt-1">Receptores de activos (sin login)</p>
        </div>
        {canEdit && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nueva Persona</Button>}
      </div>

      <DataTable
        data={persons}
        searchKeys={['name', 'email', 'area']}
        searchPlaceholder="Buscar persona..."
        columns={columns}
        actions={canEdit ? (p: Person) => (
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ) : undefined}
      />

      <ModalForm open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nueva Persona' : 'Editar Persona'} onSubmit={handleSubmit} loading={loading}>
        <div className="grid grid-cols-2 gap-3">
          {isSuperAdmin && modal?.mode === 'create' && tenants.length > 0 && (
            <div className="space-y-2 col-span-2">
              <Label>Cliente *</Label>
              <Select value={form.selectedTenantId} onValueChange={v => setForm(f => ({ ...f, selectedTenantId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2 col-span-2">
            <Label>Nombre completo *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Area</Label>
            <Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="IT, RRHH..." />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Ubicacion</Label>
            <Select value={form.locationId || '__none__'} onValueChange={v => setForm(f => ({ ...f, locationId: v === '__none__' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar ubicacion" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin ubicacion</SelectItem>
                {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.site}{l.area ? ` / ${l.area}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Notas</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </ModalForm>
    </div>
  )
}
