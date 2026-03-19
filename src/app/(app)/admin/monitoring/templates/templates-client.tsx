'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/ui/data-table'
import { ModalForm } from '@/components/ui/modal-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { createMonitoringTemplate, updateMonitoringTemplate, deleteMonitoringTemplate } from '@/lib/actions/monitoring'
import { toast } from 'sonner'
import Link from 'next/link'

type Template = {
  id: string; assetTypeName: string; zabbixTemplateName: string;
  zabbixTemplateId: string | null; protocol: string;
  defaultPort: number | null; snmpCommunity: string | null; active: boolean;
}

const protocols = ['AGENT', 'SNMP', 'ICMP', 'JMX', 'SSH']
const protocolColors: Record<string, string> = {
  AGENT: 'bg-blue-100 text-blue-800',
  SNMP: 'bg-purple-100 text-purple-800',
  ICMP: 'bg-gray-100 text-gray-800',
  JMX: 'bg-orange-100 text-orange-800',
  SSH: 'bg-green-100 text-green-800',
}

export function MonitoringTemplatesClient({ templates }: { templates: Template[] }) {
  const router = useRouter()
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; template?: Template } | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    assetTypeName: '', zabbixTemplateName: '', zabbixTemplateId: '',
    protocol: 'AGENT', defaultPort: '', snmpCommunity: '',
  })

  function openCreate() {
    setForm({ assetTypeName: '', zabbixTemplateName: '', zabbixTemplateId: '', protocol: 'AGENT', defaultPort: '', snmpCommunity: '' })
    setModal({ mode: 'create' })
  }
  function openEdit(t: Template) {
    setForm({
      assetTypeName: t.assetTypeName,
      zabbixTemplateName: t.zabbixTemplateName,
      zabbixTemplateId: t.zabbixTemplateId ?? '',
      protocol: t.protocol,
      defaultPort: t.defaultPort?.toString() ?? '',
      snmpCommunity: t.snmpCommunity ?? '',
    })
    setModal({ mode: 'edit', template: t })
  }

  async function handleSubmit() {
    if (!form.assetTypeName || !form.zabbixTemplateName) {
      toast.error('Tipo de activo y template Zabbix son requeridos')
      return
    }
    setLoading(true)
    try {
      const data = {
        assetTypeName: form.assetTypeName,
        zabbixTemplateName: form.zabbixTemplateName,
        zabbixTemplateId: form.zabbixTemplateId || undefined,
        protocol: form.protocol,
        defaultPort: form.defaultPort ? parseInt(form.defaultPort) : undefined,
        snmpCommunity: form.snmpCommunity || undefined,
      }
      if (modal?.mode === 'create') {
        await createMonitoringTemplate(data)
        toast.success('Template creado')
      } else if (modal?.template) {
        await updateMonitoringTemplate(modal.template.id, data)
        toast.success('Template actualizado')
      }
      setModal(null)
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar este template?')) return
    try { await deleteMonitoringTemplate(id); toast.success('Template desactivado'); router.refresh() }
    catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/monitoring">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Monitoreo</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Templates de Monitoreo</h1>
            <p className="text-muted-foreground mt-1">Mapeo Tipo de Activo → Template de Zabbix</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nuevo Template</Button>
      </div>

      <DataTable
        data={templates}
        searchKeys={['assetTypeName', 'zabbixTemplateName']}
        searchPlaceholder="Buscar template..."
        columns={[
          { key: 'assetTypeName', header: 'Tipo de Activo' },
          { key: 'zabbixTemplateName', header: 'Template Zabbix' },
          { key: 'protocol', header: 'Protocolo', render: (r: Template) => (
            <Badge className={protocolColors[r.protocol] ?? 'bg-gray-100 text-gray-800'}>{r.protocol}</Badge>
          )},
          { key: 'defaultPort', header: 'Puerto', render: (r: Template) => r.defaultPort ?? '—' },
          { key: 'snmpCommunity', header: 'SNMP Community', render: (r: Template) => r.snmpCommunity ?? '—' },
        ]}
        actions={(t: Template) => (
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <ModalForm open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nuevo Template' : 'Editar Template'} onSubmit={handleSubmit} loading={loading}>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Tipo de Activo (nombre) *</Label>
            <Input value={form.assetTypeName} onChange={e => setForm(f => ({ ...f, assetTypeName: e.target.value }))} placeholder="Server, Router, Switch..." autoFocus disabled={modal?.mode === 'edit'} />
          </div>
          <div className="space-y-2">
            <Label>Template Zabbix *</Label>
            <Input value={form.zabbixTemplateName} onChange={e => setForm(f => ({ ...f, zabbixTemplateName: e.target.value }))} placeholder="Linux by Zabbix agent" />
          </div>
          <div className="space-y-2">
            <Label>Template ID en Zabbix</Label>
            <Input value={form.zabbixTemplateId} onChange={e => setForm(f => ({ ...f, zabbixTemplateId: e.target.value }))} placeholder="Auto al conectar" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Protocolo *</Label>
              <Select value={form.protocol} onValueChange={v => setForm(f => ({ ...f, protocol: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {protocols.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Puerto</Label>
              <Input value={form.defaultPort} onChange={e => setForm(f => ({ ...f, defaultPort: e.target.value }))} placeholder="10050" />
            </div>
            <div className="space-y-2">
              <Label>SNMP Community</Label>
              <Input value={form.snmpCommunity} onChange={e => setForm(f => ({ ...f, snmpCommunity: e.target.value }))} placeholder="public" disabled={form.protocol !== 'SNMP'} />
            </div>
          </div>
        </div>
      </ModalForm>
    </div>
  )
}
