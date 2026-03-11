'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { createAsset, updateAsset } from '@/lib/actions/assets'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type AssetType = { id: string; name: string; category: string; requiresApproval: boolean; fieldConfig: any }
type Brand = { id: string; name: string; models: { id: string; name: string }[] }
type Location = { id: string; site: string; area: string | null; detail: string | null }
type Tenant = { id: string; name: string }

interface AssetFormProps {
  mode: 'create' | 'edit'
  assetId?: string
  assetTypes: AssetType[]
  brands: Brand[]
  locations: Location[]
  tenants: Tenant[]
  defaultTenantId: string
  currentRole: string
  initialData?: Partial<AssetFormData>
}

interface AssetFormData {
  tenantId: string; assetTypeId: string; condition: string;
  brandId: string; modelId: string; serialNumber: string; description: string;
  locationId: string; requiresApproval: boolean;
  hostname: string; os: string; cpu: string; ram: string; storageCapacity: string;
  ipAddress: string; macAddress: string; firmwareVersion: string; antivirus: string;
  warrantyExpiresAt: string; eolDate: string;
  providerName: string; providerTaxId: string; invoiceNumber: string; invoiceDate: string;
}

const conditionOptions = [
  { value: 'NEW', label: 'Nuevo' },
  { value: 'GOOD', label: 'Bueno' },
  { value: 'FAIR', label: 'Regular' },
  { value: 'POOR', label: 'Malo' },
]

export function AssetForm({ mode, assetId, assetTypes, brands, locations, tenants, defaultTenantId, currentRole, initialData }: AssetFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<AssetFormData>({
    tenantId: defaultTenantId,
    assetTypeId: '',
    condition: 'NEW',
    brandId: '',
    modelId: '',
    serialNumber: '',
    description: '',
    locationId: '',
    requiresApproval: false,
    hostname: '',
    os: '',
    cpu: '',
    ram: '',
    storageCapacity: '',
    ipAddress: '',
    macAddress: '',
    firmwareVersion: '',
    antivirus: '',
    warrantyExpiresAt: '',
    eolDate: '',
    providerName: '',
    providerTaxId: '',
    invoiceNumber: '',
    invoiceDate: '',
    ...initialData,
  })

  const selectedType = assetTypes.find(t => t.id === form.assetTypeId)
  const shownFields: string[] = (selectedType?.fieldConfig as any)?.show ?? []
  const availableModels = brands.find(b => b.id === form.brandId)?.models ?? []

  function set(key: keyof AssetFormData, value: any) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function showField(field: string) {
    return shownFields.length === 0 || shownFields.includes(field)
  }

  async function handleSubmit() {
    if (!form.assetTypeId) { toast.error('Seleccioná un tipo de activo'); return }
    if (!form.tenantId) { toast.error('Seleccioná un cliente'); return }

    setLoading(true)
    try {
      const data: any = {
        ...form,
        brandId: form.brandId || undefined,
        modelId: form.modelId || undefined,
        locationId: form.locationId || undefined,
        serialNumber: form.serialNumber || undefined,
        description: form.description || undefined,
      }

      if (mode === 'create') {
        const asset = await createAsset(data)
        toast.success(`Activo ${asset.assetTag} creado`)
        router.push(`/assets/${asset.id}`)
      } else if (assetId) {
        await updateAsset(assetId, data)
        toast.success('Activo actualizado')
        router.push(`/assets/${assetId}`)
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href={mode === 'edit' && assetId ? `/assets/${assetId}` : '/assets'}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{mode === 'create' ? 'Nuevo Activo' : 'Editar Activo'}</h1>
          <p className="text-muted-foreground mt-1">{mode === 'create' ? 'Completá los datos del activo' : 'Modificá los datos del activo'}</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Datos Generales</TabsTrigger>
          <TabsTrigger value="technical">Datos Técnicos</TabsTrigger>
          <TabsTrigger value="financial">Proveedor / Factura</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {currentRole === 'SUPER_ADMIN' && tenants.length > 0 && (
                  <div className="space-y-2 col-span-2">
                    <Label>Cliente *</Label>
                    <Select value={form.tenantId} onValueChange={v => set('tenantId', v)}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                      <SelectContent>{tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tipo de Activo *</Label>
                  <Select value={form.assetTypeId} onValueChange={v => { set('assetTypeId', v); const t = assetTypes.find(x => x.id === v); if (t) set('requiresApproval', t.requiresApproval) }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                    <SelectContent>{assetTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Condición</Label>
                  <Select value={form.condition} onValueChange={v => set('condition', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{conditionOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Select value={form.brandId} onValueChange={v => { set('brandId', v === '__none__' ? '' : v); set('modelId', '') }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar marca" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin marca</SelectItem>
                      {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={form.modelId} onValueChange={v => set('modelId', v === '__none__' ? '' : v)} disabled={!form.brandId}>
                    <SelectTrigger><SelectValue placeholder={form.brandId ? 'Seleccionar modelo' : 'Primero seleccioná marca'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin modelo</SelectItem>
                      {availableModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Número de Serie</Label>
                  <Input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} placeholder="SN-XXXXX" />
                </div>

                <div className="space-y-2">
                  <Label>Ubicación</Label>
                  <Select value={form.locationId} onValueChange={v => set('locationId', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar ubicación" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin ubicación</SelectItem>
                      {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.site}{l.area ? ` / ${l.area}` : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Descripción</Label>
                  <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Descripción opcional del activo" />
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="ra" checked={form.requiresApproval} onChange={e => set('requiresApproval', e.target.checked)} className="rounded" />
                  <Label htmlFor="ra">Requiere aprobación para asignación</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                {showField('hostname') && (
                  <div className="space-y-2">
                    <Label>Hostname</Label>
                    <Input value={form.hostname} onChange={e => set('hostname', e.target.value)} />
                  </div>
                )}
                {showField('os') && (
                  <div className="space-y-2">
                    <Label>Sistema Operativo</Label>
                    <Input value={form.os} onChange={e => set('os', e.target.value)} placeholder="Windows 11, Ubuntu 22.04..." />
                  </div>
                )}
                {showField('cpu') && (
                  <div className="space-y-2">
                    <Label>CPU</Label>
                    <Input value={form.cpu} onChange={e => set('cpu', e.target.value)} placeholder="Intel Core i7-1165G7" />
                  </div>
                )}
                {showField('ram') && (
                  <div className="space-y-2">
                    <Label>RAM</Label>
                    <Input value={form.ram} onChange={e => set('ram', e.target.value)} placeholder="16 GB DDR4" />
                  </div>
                )}
                {showField('storageCapacity') && (
                  <div className="space-y-2">
                    <Label>Almacenamiento</Label>
                    <Input value={form.storageCapacity} onChange={e => set('storageCapacity', e.target.value)} placeholder="512 GB SSD" />
                  </div>
                )}
                {showField('ipAddress') && (
                  <div className="space-y-2">
                    <Label>IP</Label>
                    <Input value={form.ipAddress} onChange={e => set('ipAddress', e.target.value)} placeholder="192.168.1.100" />
                  </div>
                )}
                {showField('macAddress') && (
                  <div className="space-y-2">
                    <Label>MAC Address</Label>
                    <Input value={form.macAddress} onChange={e => set('macAddress', e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" />
                  </div>
                )}
                {showField('firmwareVersion') && (
                  <div className="space-y-2">
                    <Label>Firmware</Label>
                    <Input value={form.firmwareVersion} onChange={e => set('firmwareVersion', e.target.value)} />
                  </div>
                )}
                {showField('antivirus') && (
                  <div className="space-y-2">
                    <Label>Antivirus</Label>
                    <Input value={form.antivirus} onChange={e => set('antivirus', e.target.value)} />
                  </div>
                )}
                {showField('warrantyExpiresAt') && (
                  <div className="space-y-2">
                    <Label>Vencimiento de Garantía</Label>
                    <Input type="date" value={form.warrantyExpiresAt} onChange={e => set('warrantyExpiresAt', e.target.value)} />
                  </div>
                )}
                {showField('eolDate') && (
                  <div className="space-y-2">
                    <Label>Fecha EOL</Label>
                    <Input type="date" value={form.eolDate} onChange={e => set('eolDate', e.target.value)} />
                  </div>
                )}
                {!selectedType && (
                  <div className="col-span-2 text-center text-muted-foreground py-8 text-sm">
                    Seleccioná un tipo de activo para ver los campos técnicos aplicables
                  </div>
                )}
                {selectedType && shownFields.length === 0 && (
                  <div className="col-span-2 text-center text-muted-foreground py-4 text-sm">
                    Este tipo no tiene campos técnicos configurados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Input value={form.providerName} onChange={e => set('providerName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CUIT del Proveedor</Label>
                  <Input value={form.providerTaxId} onChange={e => set('providerTaxId', e.target.value)} placeholder="20-12345678-9" />
                </div>
                <div className="space-y-2">
                  <Label>Número de Factura</Label>
                  <Input value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Factura</Label>
                  <Input type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={loading} size="lg">
          {loading ? 'Guardando...' : mode === 'create' ? 'Crear Activo' : 'Guardar Cambios'}
        </Button>
        <Link href={mode === 'edit' && assetId ? `/assets/${assetId}` : '/assets'}>
          <Button variant="outline" size="lg" disabled={loading}>Cancelar</Button>
        </Link>
      </div>
    </div>
  )
}
