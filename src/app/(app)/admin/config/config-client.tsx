'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, Tag, LayoutGrid, ChevronDown, ChevronRight, Power, PowerOff } from 'lucide-react'
import {
  createAssetTypeMaster, updateAssetTypeMaster, deleteAssetTypeMaster,
  createAssetCategory, updateAssetCategory, toggleAssetCategoryActive,
} from '@/lib/actions/config'
import { toast } from 'sonner'

type Category = { id: string; code: string; name: string; description: string | null; active: boolean }
type TypeName = {
  id: string
  name: string
  categoryId: string
  category: Pick<Category, 'id' | 'code' | 'name'>
}

function CollapsibleCard({
  title, subtitle, icon: Icon, defaultOpen = true, action, children,
}: {
  title: string; subtitle: string; icon: any; defaultOpen?: boolean
  action?: React.ReactNode; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500" />
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {action}
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-500"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && <div>{children}</div>}
    </div>
  )
}

export function ConfigClient({
  typeNames,
  categories,
  isSuperAdmin,
}: {
  typeNames: TypeName[]
  categories: Category[]
  isSuperAdmin: boolean
}) {
  const router = useRouter()
  const activeCategories = categories.filter(c => c.active)

  // ── TypeName state ──────────────────────────────────────────────────────────
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [editTypeValue, setEditTypeValue] = useState('')
  const [editTypeCategoryId, setEditTypeCategoryId] = useState('')
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeCategoryId, setNewTypeCategoryId] = useState(activeCategories[0]?.id ?? '')
  const [addingType, setAddingType] = useState(false)
  const [loadingType, setLoadingType] = useState(false)

  async function handleAddType() {
    if (!newTypeName.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (!newTypeCategoryId) {
      toast.error('La categoría es obligatoria')
      return
    }

    setLoadingType(true)
    try {
      await createAssetTypeMaster({
        name: newTypeName.trim(),
        categoryId: newTypeCategoryId,
      })
      setNewTypeName('')
      setNewTypeCategoryId(activeCategories[0]?.id ?? '')
      setAddingType(false)
      toast.success('Tipo agregado')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingType(false)
    }
  }

  async function handleEditType(id: string) {
    if (!editTypeValue.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (!editTypeCategoryId) {
      toast.error('La categoría es obligatoria')
      return
    }

    setLoadingType(true)
    try {
      await updateAssetTypeMaster(id, {
        name: editTypeValue.trim(),
        categoryId: editTypeCategoryId,
      })
      setEditingTypeId(null)
      setEditTypeValue('')
      setEditTypeCategoryId('')
      toast.success('Tipo actualizado')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingType(false)
    }
  }

  async function handleDeleteType(id: string, name: string) {
    if (!confirm(`Desactivar "${name}"?`)) return
    setLoadingType(true)
    try {
      await deleteAssetTypeMaster(id)
      toast.success('Desactivado')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingType(false)
    }
  }

  // ── Category state ──────────────────────────────────────────────────────────
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCat, setEditCat] = useState({ name: '', code: '', description: '' })
  const [addingCat, setAddingCat] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', code: '', description: '' })
  const [loadingCat, setLoadingCat] = useState(false)

  function autoCode(name: string) {
    return name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20)
  }

  async function handleAddCat() {
    if (!newCat.name.trim() || !newCat.code.trim()) {
      toast.error('Nombre y código son obligatorios')
      return
    }
    setLoadingCat(true)
    try {
      await createAssetCategory({ name: newCat.name, code: newCat.code, description: newCat.description || undefined })
      setNewCat({ name: '', code: '', description: '' })
      setAddingCat(false)
      toast.success('Categoría creada')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingCat(false)
    }
  }

  async function handleEditCat(id: string) {
    if (!editCat.name.trim() || !editCat.code.trim()) {
      toast.error('Nombre y código son obligatorios')
      return
    }
    setLoadingCat(true)
    try {
      await updateAssetCategory(id, { name: editCat.name, code: editCat.code, description: editCat.description || undefined })
      setEditingCatId(null)
      toast.success('Categoría actualizada')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingCat(false)
    }
  }

  async function handleToggleCat(cat: Category) {
    setLoadingCat(true)
    try {
      const result = await toggleAssetCategoryActive(cat.id)
      toast.success(`Categoría ${result.active ? 'activada' : 'desactivada'}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingCat(false)
    }
  }

  function startEditType(type: TypeName) {
    setEditingTypeId(type.id)
    setEditTypeValue(type.name)
    setEditTypeCategoryId(type.categoryId)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">Maestros y parámetros del sistema</p>
      </div>

      <CollapsibleCard
        title="Categorías de activos"
        subtitle="Clasificación estructural — asociada a tipos de activo"
        icon={LayoutGrid}
        action={isSuperAdmin ? (
          <Button size="sm" variant="outline" onClick={() => { setAddingCat(true); setNewCat({ name: '', code: '', description: '' }) }}>
            <Plus className="h-3.5 w-3.5 mr-1" />Agregar
          </Button>
        ) : undefined}
      >
        <div className="divide-y">
          {categories.map(cat => (
            <div key={cat.id} className={`px-5 py-3 hover:bg-gray-50 ${!cat.active ? 'opacity-60' : ''}`}>
              {editingCatId === cat.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input
                        value={editCat.name}
                        onChange={e => setEditCat(f => ({ ...f, name: e.target.value }))}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="w-36 space-y-1">
                      <Label className="text-xs">Código</Label>
                      <Input
                        value={editCat.code}
                        onChange={e => setEditCat(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                        className="h-8 text-sm font-mono"
                        maxLength={20}
                      />
                    </div>
                  </div>
                  <Input
                    value={editCat.description}
                    onChange={e => setEditCat(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descripción (opcional)"
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEditCat(cat.id)} disabled={loadingCat}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCatId(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{cat.code}</span>
                      {!cat.active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inactiva</span>}
                    </div>
                    {cat.description && <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>}
                  </div>
                  {isSuperAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm"
                        onClick={() => { setEditingCatId(cat.id); setEditCat({ name: cat.name, code: cat.code, description: cat.description ?? '' }) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" disabled={loadingCat}
                        className={cat.active ? 'text-orange-500 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                        onClick={() => handleToggleCat(cat)}
                        title={cat.active ? 'Desactivar' : 'Activar'}
                      >
                        {cat.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {addingCat && (
            <div className="px-5 py-4 bg-blue-50 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Nombre *</Label>
                  <Input
                    value={newCat.name}
                    onChange={e => setNewCat(f => ({ ...f, name: e.target.value, code: f.code || autoCode(e.target.value) }))}
                    placeholder="Ej: Telefonía"
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div className="w-36 space-y-1">
                  <Label className="text-xs">Código *</Label>
                  <Input
                    value={newCat.code}
                    onChange={e => setNewCat(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                    placeholder="TELEFONIA"
                    className="h-8 text-sm font-mono"
                    maxLength={20}
                  />
                </div>
              </div>
              <Input
                value={newCat.description}
                onChange={e => setNewCat(f => ({ ...f, description: e.target.value }))}
                placeholder="Descripción (opcional)"
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">El código se usa para generar el asset tag (primeras 3 letras)</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCat} disabled={loadingCat}>Guardar</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingCat(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {categories.length === 0 && !addingCat && (
            <p className="px-5 py-4 text-sm text-muted-foreground">Sin categorías configuradas</p>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Nombres de tipos de activo"
        subtitle="Cada tipo maestro queda asociado a una categoría existente"
        icon={Tag}
        action={isSuperAdmin ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAddingType(true)
              setNewTypeName('')
              setNewTypeCategoryId(activeCategories[0]?.id ?? '')
            }}
            disabled={activeCategories.length === 0}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />Agregar
          </Button>
        ) : undefined}
      >
        <div className="divide-y">
          {typeNames.map(t => (
            <div key={t.id} className="px-5 py-3 hover:bg-gray-50">
              {editingTypeId === t.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr),220px]">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input
                        value={editTypeValue}
                        onChange={e => setEditTypeValue(e.target.value)}
                        className="h-8 text-sm"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleEditType(t.id)
                          if (e.key === 'Escape') setEditingTypeId(null)
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Categoría</Label>
                      <Select value={editTypeCategoryId} onValueChange={setEditTypeCategoryId}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeCategories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name} ({category.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEditType(t.id)} disabled={loadingType}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTypeId(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Categoría: {t.category?.name} <span className="font-mono">({t.category?.code})</span>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEditType(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteType(t.id, t.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {addingType && (
            <div className="px-5 py-4 bg-blue-50 space-y-2">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr),220px]">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre *</Label>
                  <Input
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    placeholder="Nombre del tipo..."
                    className="h-8 text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddType()
                      if (e.key === 'Escape') setAddingType(false)
                    }}
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Categoría *</Label>
                  <Select value={newTypeCategoryId} onValueChange={setNewTypeCategoryId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name} ({category.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddType} disabled={loadingType}>Guardar</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingType(false)}>Cancelar</Button>
              </div>
            </div>
          )}
          {typeNames.length === 0 && !addingType && (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              {activeCategories.length === 0
                ? 'Primero configurá al menos una categoría activa.'
                : 'Sin tipos configurados'}
            </p>
          )}
        </div>
      </CollapsibleCard>
    </div>
  )
}
