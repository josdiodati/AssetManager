'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/ui/data-table'
import { ModalForm } from '@/components/ui/modal-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil } from 'lucide-react'
import { createAssetType, updateAssetType } from '@/lib/actions/asset-types'
import { toast } from 'sonner'

type AssetType = { id: string; name: string; category: string; requiresApproval: boolean; allowsPersonAssignment: boolean; active: boolean }

const categoryLabels: Record<string, string> = {
  INFRASTRUCTURE: 'Infraestructura', TERMINAL: 'Terminal', PERIPHERAL: 'Periférico',
  STORAGE: 'Almacenamiento', VIRTUAL: 'Virtual', NETWORKING: 'Networking', OTHER: 'Otro'
}

export function AssetTypesClient({ assetTypes }: { assetTypes: AssetType[] }) {
  const router = useRouter()
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; type?: AssetType } | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'TERMINAL', requiresApproval: false, allowsPersonAssignment: true })

  function openCreate() { setForm({ name: '', category: 'TERMINAL', requiresApproval: false, allowsPersonAssignment: true }); setModal({ mode: 'create' }) }
  function openEdit(t: AssetType) { setForm({ name: t.name, category: t.category, requiresApproval: t.requiresApproval, allowsPersonAssignment: t.allowsPersonAssignment }); setModal({ mode: 'edit', type: t }) }

  async function handleSubmit() {
    setLoading(true)
    try {
      if (modal?.mode === 'create') {
        await createAssetType({ ...form, fieldConfig: {} })
        toast.success('Tipo creado')
      } else if (modal?.type) {
        await updateAssetType(modal.type.id, { name: form.name, requiresApproval: form.requiresApproval, allowsPersonAssignment: form.allowsPersonAssignment })
        toast.success('Tipo actualizado')
      }
      setModal(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tipos de Activos</h1>
          <p className="text-muted-foreground mt-1">Categorías y configuración de tipos</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nuevo Tipo</Button>
      </div>
      <DataTable
        data={assetTypes}
        searchKeys={['name']}
        searchPlaceholder="Buscar tipo..."
        columns={[
          { key: 'name', header: 'Nombre' },
          { key: 'category', header: 'Categoría', render: r => categoryLabels[r.category] ?? r.category },
          { key: 'requiresApproval', header: 'Requiere Aprobación', render: r => r.requiresApproval ? 'Sí' : 'No' },
          { key: 'allowsPersonAssignment', header: 'Asignable a Persona', render: r => r.allowsPersonAssignment ? 'Sí' : 'No' },
          { key: 'active', header: 'Estado', render: r => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{r.active ? 'Activo' : 'Inactivo'}</span> },
        ]}
        actions={t => (
          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
        )}
      />
      <ModalForm open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nuevo Tipo' : 'Editar Tipo'} onSubmit={handleSubmit} loading={loading}>
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        {modal?.mode === 'create' && (
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="ra" checked={form.requiresApproval} onChange={e => setForm(f => ({ ...f, requiresApproval: e.target.checked }))} className="rounded" />
          <Label htmlFor="ra">Requiere aprobación para asignación</Label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="ap" checked={form.allowsPersonAssignment} onChange={e => setForm(f => ({ ...f, allowsPersonAssignment: e.target.checked }))} className="rounded" />
          <Label htmlFor="ap">Permite asignación a persona</Label>
        </div>
      </ModalForm>
    </div>
  )
}
