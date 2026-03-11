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
import { createUser, updateUser, deleteUser } from '@/lib/actions/users'
import { toast } from 'sonner'

type User = { id: string; name: string; email: string; role: string; active: boolean; tenant?: { name: string } | null }
type Tenant = { id: string; name: string }

const roleLabels: Record<string, string> = { SUPER_ADMIN: 'Super Admin', INTERNAL_ADMIN: 'Admin Interno', CLIENT_ADMIN: 'Admin Cliente' }

export function UsersClient({ users, tenants, currentRole }: { users: User[]; tenants: Tenant[]; currentRole: string }) {
  const router = useRouter()
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; user?: User } | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CLIENT_ADMIN', tenantId: '', language: 'es' as 'es' | 'en' })

  function openCreate() { setForm({ name: '', email: '', password: '', role: 'CLIENT_ADMIN', tenantId: '', language: 'es' }); setModal({ mode: 'create' }) }
  function openEdit(u: User) { setForm({ name: u.name, email: u.email, password: '', role: u.role, tenantId: '', language: 'es' }); setModal({ mode: 'edit', user: u }) }

  async function handleSubmit() {
    setLoading(true)
    try {
      if (modal?.mode === 'create') {
        await createUser({ name: form.name, email: form.email, password: form.password, role: form.role as any, tenantId: form.tenantId || null, language: form.language })
        toast.success('Usuario creado')
      } else if (modal?.user) {
        const data: any = { name: form.name, email: form.email, role: form.role }
        if (form.password) data.password = form.password
        await updateUser(modal.user.id, data)
        toast.success('Usuario actualizado')
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
    if (!confirm('¿Desactivar este usuario?')) return
    try {
      await deleteUser(id)
      toast.success('Usuario desactivado')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground mt-1">Usuarios con acceso a la plataforma</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nuevo Usuario</Button>
      </div>

      <DataTable
        data={users}
        searchKeys={['name', 'email']}
        searchPlaceholder="Buscar usuario..."
        columns={[
          { key: 'name', header: 'Nombre' },
          { key: 'email', header: 'Email' },
          { key: 'role', header: 'Rol', render: (r) => <span className="text-sm">{roleLabels[r.role] ?? r.role}</span> },
          { key: 'tenant', header: 'Cliente', render: (r) => <span className="text-sm">{r.tenant?.name ?? '—'}</span> },
          { key: 'active', header: 'Estado', render: (r) => (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {r.active ? 'Activo' : 'Inactivo'}
            </span>
          )},
        ]}
        actions={(u) => (
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <ModalForm open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'} onSubmit={handleSubmit} loading={loading}>
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>{modal?.mode === 'create' ? 'Contraseña' : 'Nueva contraseña (opcional)'}</Label>
          <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={modal?.mode === 'edit' ? 'Dejar vacío para no cambiar' : ''} />
        </div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {currentRole === 'SUPER_ADMIN' && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
              <SelectItem value="INTERNAL_ADMIN">Admin Interno</SelectItem>
              <SelectItem value="CLIENT_ADMIN">Admin Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(form.role === 'CLIENT_ADMIN' && tenants.length > 0) && (
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={form.tenantId} onValueChange={v => setForm(f => ({ ...f, tenantId: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </ModalForm>
    </div>
  )
}
