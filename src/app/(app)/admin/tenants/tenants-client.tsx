'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/ui/data-table'
import { ModalForm } from '@/components/ui/modal-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createTenant, updateTenant, deleteTenant } from '@/lib/actions/tenants'
import { toast } from 'sonner'

type Tenant = { id: string; name: string; slug: string; active: boolean; createdAt: Date }

export function TenantsClient({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter()
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; tenant?: Tenant } | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '' })

  function openCreate() { setForm({ name: '', slug: '' }); setModal({ mode: 'create' }) }
  function openEdit(t: Tenant) { setForm({ name: t.name, slug: t.slug }); setModal({ mode: 'edit', tenant: t }) }

  async function handleSubmit() {
    setLoading(true)
    try {
      if (modal?.mode === 'create') {
        await createTenant({ name: form.name, slug: form.slug, active: true })
        toast.success('Cliente creado')
      } else if (modal?.tenant) {
        await updateTenant(modal.tenant.id, { name: form.name, slug: form.slug })
        toast.success('Cliente actualizado')
      }
      setModal(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar este cliente?')) return
    try {
      await deleteTenant(id)
      toast.success('Cliente desactivado')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gestión de tenants de la plataforma</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nuevo Cliente</Button>
      </div>

      <DataTable
        data={tenants}
        searchKeys={['name', 'slug']}
        searchPlaceholder="Buscar cliente..."
        columns={[
          { key: 'name', header: 'Nombre' },
          { key: 'slug', header: 'Slug' },
          { key: 'active', header: 'Estado', render: (r) => (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {r.active ? 'Activo' : 'Inactivo'}
            </span>
          )},
        ]}
        actions={(t) => (
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <ModalForm open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'} onSubmit={handleSubmit} loading={loading}>
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: modal?.mode === 'create' ? e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : f.slug }))} placeholder="Mi Empresa" />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="mi-empresa" />
          <p className="text-xs text-muted-foreground">Solo minúsculas, números y guiones</p>
        </div>
      </ModalForm>
    </div>
  )
}
