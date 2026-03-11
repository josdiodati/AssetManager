'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalForm } from '@/components/ui/modal-form'
import { Plus, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { createBrand, createModel, updateBrand, updateModel } from '@/lib/actions/brands'
import { toast } from 'sonner'

type ModelType = { id: string; name: string; active: boolean }
type BrandType = { id: string; name: string; active: boolean; models: ModelType[] }

export function BrandsClient({ brands }: { brands: BrandType[] }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<{ type: 'brand' | 'model'; brandId?: string; item?: any } | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  function toggle(id: string) { setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  async function handleSubmit() {
    setLoading(true)
    try {
      if (modal?.type === 'brand') {
        if (modal.item) await updateBrand(modal.item.id, { name })
        else await createBrand(name)
        toast.success(modal.item ? 'Marca actualizada' : 'Marca creada')
      } else if (modal?.brandId) {
        if (modal.item) await updateModel(modal.item.id, { name })
        else await createModel(modal.brandId, name)
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
        <Button onClick={() => { setName(''); setModal({ type: 'brand' }) }}><Plus className="h-4 w-4 mr-2" />Nueva Marca</Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        {brands.length === 0 ? (
          <p className="px-4 py-8 text-center text-muted-foreground">Sin marcas registradas</p>
        ) : (
          brands.map(brand => (
            <div key={brand.id} className="border-b last:border-0">
              <div className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => toggle(brand.id)}>
                {expanded.has(brand.id) ? <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />}
                <span className="font-medium flex-1">{brand.name}</span>
                <span className="text-xs text-muted-foreground mr-4">{brand.models.length} modelo{brand.models.length !== 1 ? 's' : ''}</span>
                <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setName(brand.name); setModal({ type: 'brand', item: brand }) }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              {expanded.has(brand.id) && (
                <div className="bg-gray-50 px-8 py-2 space-y-1">
                  {brand.models.map(m => (
                    <div key={m.id} className="flex items-center py-1.5">
                      <span className="flex-1 text-sm">{m.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => { setName(m.name); setModal({ type: 'model', brandId: brand.id, item: m }) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 mt-1" onClick={() => { setName(''); setModal({ type: 'model', brandId: brand.id }) }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Agregar modelo
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ModalForm
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'brand' ? (modal.item ? 'Editar Marca' : 'Nueva Marca') : (modal?.item ? 'Editar Modelo' : 'Nuevo Modelo')}
        onSubmit={handleSubmit}
        loading={loading}
      >
        <div className="space-y-2">
          <Label>{modal?.type === 'brand' ? 'Nombre de la marca' : 'Nombre del modelo'}</Label>
          <Input value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
      </ModalForm>
    </div>
  )
}
