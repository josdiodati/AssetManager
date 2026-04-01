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

type Category = { id: string; code: string; name: string }
type AssetType = {
  id: string
  name: string
  categoryId: string
  category: Category
  requiresApproval: boolean
  allowsPersonAssignment: boolean
  isMonitorable: boolean
  active: boolean
}

export function AssetTypesClient({
  assetTypes,
  categories = [],
}: {
  assetTypes: AssetType[]
  categories?: Category[]
}) {
  const router = useRouter()
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; type?: AssetType } | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    categoryId: categories[0]?.id ?? '',
    requiresApproval: false,
    allowsPersonAssignment: true,
    isMonitorable: false,
  })

  function openCreate() {
    setForm({ name: '', categoryId: categories[0]?.id ?? '', requiresApproval: false, allowsPersonAssignment: true, isMonitorable: false })
    setModal({ mode: 'create' })
  }

  function openEdit(t: AssetType) {
    setForm({
      name: t.name,
      categoryId: t.categoryId,
      requiresApproval: t.requiresApproval,
      allowsPersonAssignment: t.allowsPersonAssignment,
      isMonitorable: t.isMonitorable,
    })
    setModal({ mode: 'edit', type: t })
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (!form.categoryId) {
      toast.error('La categoría es obligatoria')
      return
    }

    setLoading(true)
    try {
      if (modal?.mode === 'create') {
        await createAssetType({ ...form, name: form.name.trim(), fieldConfig: {} })
        toast.success('Tipo creado')
      } else if (modal?.type) {
        await updateAssetType(modal.type.id, {
          name: form.name.trim(),
          categoryId: form.categoryId,
          requiresApproval: form.requiresApproval,
          allowsPersonAssignment: form.allowsPersonAssignment,
          isMonitorable: form.isMonitorable,
        })
        toast.success('Tipo actualizado')
      }
      setModal(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Tipos de Activos</h1>
          <p className='text-muted-foreground mt-1'>Configuración real de tipos y su comportamiento</p>
        </div>
        <Button onClick={openCreate}><Plus className='h-4 w-4 mr-2' />Nuevo Tipo</Button>
      </div>

      <DataTable
        data={assetTypes}
        searchKeys={['name']}
        searchPlaceholder='Buscar tipo...'
        columns={[
          { key: 'name', header: 'Nombre' },
          { key: 'category', header: 'Categoría', render: r => (
            <span className='inline-flex items-center gap-1.5'>
              <span className='font-medium'>{r.category?.name ?? '—'}</span>
              <span className='text-xs text-muted-foreground font-mono'>({r.category?.code})</span>
            </span>
          )},
          { key: 'requiresApproval', header: 'Requiere Aprobación', render: r => r.requiresApproval ? 'Sí' : 'No' },
          { key: 'allowsPersonAssignment', header: 'Asignable a Persona', render: r => r.allowsPersonAssignment ? 'Sí' : 'No' },
          { key: 'isMonitorable', header: 'Monitoreable', render: r => r.isMonitorable ? 'Sí' : 'No' },
          { key: 'active', header: 'Estado', render: r => (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {r.active ? 'Activo' : 'Inactivo'}
            </span>
          )},
        ]}
        actions={t => (
          <Button variant='ghost' size='sm' onClick={() => openEdit(t)}><Pencil className='h-4 w-4' /></Button>
        )}
      />

      <ModalForm
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Nuevo Tipo' : 'Editar Tipo'}
        onSubmit={handleSubmit}
        loading={loading}
      >
        <div className='space-y-2'>
          <Label>Nombre</Label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder='Ej: Laptop, Router, Cámara IP'
            autoFocus
          />
        </div>
        <div className='space-y-2'>
          <Label>Categoría</Label>
          <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
            <SelectTrigger><SelectValue placeholder='Seleccionar categoría' /></SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-center gap-2'>
          <input type='checkbox' id='ra' checked={form.requiresApproval}
            onChange={e => setForm(f => ({ ...f, requiresApproval: e.target.checked }))} className='rounded' />
          <Label htmlFor='ra'>Requiere aprobación para asignación</Label>
        </div>
        <div className='flex items-center gap-2'>
          <input type='checkbox' id='ap' checked={form.allowsPersonAssignment}
            onChange={e => setForm(f => ({ ...f, allowsPersonAssignment: e.target.checked }))} className='rounded' />
          <Label htmlFor='ap'>Permite asignación a persona</Label>
        </div>
        <div className='flex items-center gap-2'>
          <input type='checkbox' id='mon' checked={form.isMonitorable}
            onChange={e => setForm(f => ({ ...f, isMonitorable: e.target.checked }))} className='rounded' />
          <Label htmlFor='mon'>Es monitoreable</Label>
        </div>
      </ModalForm>
    </div>
  )
}
