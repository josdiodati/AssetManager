'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Trash2, Settings, Tag, LayoutGrid } from 'lucide-react'
import { createAssetTypeMaster, updateAssetTypeMaster, deleteAssetTypeMaster } from '@/lib/actions/config'
import { toast } from 'sonner'

const CATEGORIES = [
  { code: 'TERMINAL',       label: 'Terminal',        desc: 'Laptops, desktops, tablets' },
  { code: 'PERIPHERAL',     label: 'Periférico',       desc: 'Monitores, impresoras, cámaras' },
  { code: 'INFRASTRUCTURE', label: 'Infraestructura',  desc: 'Servidores, NAS, SAIs' },
  { code: 'NETWORKING',     label: 'Networking',       desc: 'Switches, routers, APs' },
  { code: 'VIRTUAL',        label: 'Virtual',          desc: 'Máquinas virtuales, contenedores' },
  { code: 'STORAGE',        label: 'Almacenamiento',   desc: 'Discos, NAS, SAN' },
  { code: 'OTHER',          label: 'Otro',             desc: 'Equipos sin categoría específica' },
]

type TypeName = { id: string; name: string }

export function ConfigClient({ typeNames, isSuperAdmin }: { typeNames: TypeName[]; isSuperAdmin: boolean }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    setLoading(true)
    try {
      await createAssetTypeMaster(newName.trim())
      setNewName('')
      setAdding(false)
      toast.success('Nombre de tipo agregado')
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function handleEdit(id: string) {
    if (!editValue.trim()) return
    setLoading(true)
    try {
      await updateAssetTypeMaster(id, editValue.trim())
      setEditingId(null)
      toast.success('Actualizado')
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Desactivar "${name}"?`)) return
    setLoading(true)
    try {
      await deleteAssetTypeMaster(id)
      toast.success('Desactivado')
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">Maestros y parámetros del sistema</p>
      </div>

      {/* Asset Type Names master */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-gray-500" />
            <div>
              <h2 className="font-semibold text-gray-900">Nombres de tipos de activo</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Valores disponibles al crear un tipo de activo</p>
            </div>
          </div>
          {isSuperAdmin && (
            <Button size="sm" variant="outline" onClick={() => { setAdding(true); setNewName('') }}>
              <Plus className="h-3.5 w-3.5 mr-1" />Agregar
            </Button>
          )}
        </div>

        <div className="divide-y">
          {typeNames.map(t => (
            <div key={t.id} className="flex items-center px-5 py-3 hover:bg-gray-50">
              {editingId === t.id ? (
                <>
                  <Input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="h-8 text-sm flex-1 mr-2"
                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(t.id); if (e.key === 'Escape') setEditingId(null) }}
                    autoFocus
                  />
                  <Button size="sm" onClick={() => handleEdit(t.id)} disabled={loading} className="mr-1">Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{t.name}</span>
                  {isSuperAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(t.id); setEditValue(t.name) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(t.id, t.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {adding && (
            <div className="flex items-center px-5 py-3 bg-blue-50">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre del tipo..."
                className="h-8 text-sm flex-1 mr-2"
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
                autoFocus
              />
              <Button size="sm" onClick={handleAdd} disabled={loading} className="mr-1">Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
            </div>
          )}
          {typeNames.length === 0 && !adding && (
            <p className="px-5 py-4 text-sm text-muted-foreground">Sin nombres configurados</p>
          )}
        </div>
      </div>

      {/* Categories reference */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 bg-gray-50 border-b">
          <LayoutGrid className="h-4 w-4 text-gray-500" />
          <div>
            <h2 className="font-semibold text-gray-900">Categorías de activos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Clasificación estructural — fija del sistema</p>
          </div>
        </div>
        <div className="divide-y">
          {CATEGORIES.map(c => (
            <div key={c.code} className="flex items-center px-5 py-3">
              <span className="text-sm font-medium w-40">{c.label}</span>
              <span className="text-xs text-muted-foreground">{c.desc}</span>
              <span className="ml-auto text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{c.code}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
