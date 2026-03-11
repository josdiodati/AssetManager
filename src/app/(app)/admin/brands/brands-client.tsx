'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ModalForm } from '@/components/ui/modal-form'
import { Plus, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { createBrand, createModel, updateBrand, updateModel } from '@/lib/actions/brands'
import { toast } from 'sonner'

const ASSET_TYPES = ['Laptop', 'Desktop', 'Monitor', 'Servidor', 'Virtual', 'Switch', 'Router', 'Impresora', 'Camara', 'Tablet']

type ModelType = { id: string; name: string; active: boolean; assetTypeName: string | null }
type BrandType = { id: string; name: string; active: boolean; models: ModelType[] }

export function BrandsClient({ brands }: { brands: BrandType[] }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<{ type: 'brand' | 'model'; brandId?: string; item?: any } | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [assetTypeName, setAssetTypeName] = useState('')

  function toggle(id: string) {
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      if (modal?.type === 'brand') {
        if (modal.item) await updateBrand(modal.item.id, { name })
        else await createBrand(name)
        toast.success(modal.item ? 'Marca actualizada' : 'Marca creada')
      } else if (modal?.brandId) {
        if (modal.item) await updateModel(modal.item.id, { name, assetTypeName: assetTypeName || null })
        else await createModel(modal.brandId, name, assetTypeName || undefined)
        toast.success(modal.item ? 'Modelo actualizado' : 'Modelo creado')
      }
      setModal(null)
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marcas y Modelos</h1>
          <p className="text-muted-foreground mt-1">Maestro de marcas y modelos de activos</p>
        </div>
        <Button onClick={() => { setName(''); setModal({ type: 'brand' }) }}>
          <Plus className="h-4 w-4 mr-2" />Nueva Marca
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        {brands.length === 0 ? (
          <p className="px-4 py-8 text-center text-muted-foreground">Sin marcas registradas</p>
        ) : (
          brands.map(brand => {
            // Group models by assetTypeName
            const grouped: Record<string, ModelType[]> = {}
            const noType: ModelType[] = []
            for (const m of brand.models) {
              if (m.assetTypeName) {
                if (!grouped[m.assetTypeName]) grouped[m.assetTypeName] = []
                grouped[m.assetTypeName].push(m)
              } else {
                noType.push(m)
              }
            }
            const sortedTypes = Object.keys(grouped).sort()
            if (noType.length > 0) sortedTypes.push('__none__')

            return (
              <div key={brand.id} className="border-b last:border-0">
                {/* Brand header */}
                <div className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => toggle(brand.id)}>
                  {expanded.has(brand.id)
                    ? <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />}
                  <span className="font-medium flex-1">{brand.name}</span>
                  <span className="text-xs text-muted-foreground mr-4">
                    {brand.models.length} modelo{brand.models.length !== 1 ? 's' : ''}
                  </span>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setName(brand.name); setModal({ type: 'brand', item: brand }) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Models grouped by type */}
                {expanded.has(brand.id) && (
                  <div className="bg-gray-50 px-6 py-2">
                    {sortedTypes.map(typeName => {
                      const models = typeName === '__none__' ? noType : grouped[typeName]
                      return (
                        <div key={typeName} className="mb-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1 px-2">
                            {typeName === '__none__' ? 'Sin tipo' : typeName}
                          </div>
                          {models.map(m => (
                            <div key={m.id} className="flex items-center py-1 px-2 rounded hover:bg-gray-100">
                              <span className="flex-1 text-sm text-gray-700">{m.name}</span>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setName(m.name)
                                setAssetTypeName(m.assetTypeName ?? '')
                                setModal({ type: 'model', brandId: brand.id, item: m })
                              }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 mt-1" onClick={() => {
                      setName('')
                      setAssetTypeName('')
                      setModal({ type: 'model', brandId: brand.id })
                    }}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Agregar modelo
                    </Button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <ModalForm
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'brand'
          ? (modal.item ? 'Editar Marca' : 'Nueva Marca')
          : (modal?.item ? 'Editar Modelo' : 'Nuevo Modelo')}
        onSubmit={handleSubmit}
        loading={loading}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{modal?.type === 'brand' ? 'Nombre de la marca' : 'Nombre del modelo'}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          {modal?.type === 'model' && (
            <div className="space-y-2">
              <Label>Tipo de activo</Label>
              <Select value={assetTypeName || '__none__'} onValueChange={v => setAssetTypeName(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin tipo</SelectItem>
                  {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </ModalForm>
    </div>
  )
}
