'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveTemplate, getTemplate } from '@/lib/actions/templates'
import { DEFAULT_TEMPLATE_SUBJECT, DEFAULT_TEMPLATE_BODY } from '@/lib/template-defaults'

const VARIABLES = [
  { key: '{{personName}}', desc: 'Nombre del destinatario' },
  { key: '{{assetTag}}', desc: 'Tag del activo' },
  { key: '{{assetType}}', desc: 'Tipo de activo' },
  { key: '{{brand}}', desc: 'Marca' },
  { key: '{{model}}', desc: 'Modelo' },
  { key: '{{serialNumber}}', desc: 'Número de serie' },
  { key: '{{acceptanceUrl}}', desc: 'Enlace de confirmación' },
]

const SAMPLE_VALUES: Record<string, string> = {
  '{{personName}}': 'Juan Pérez',
  '{{assetTag}}': 'ASSET-0042',
  '{{assetType}}': 'Laptop',
  '{{brand}}': 'Dell',
  '{{model}}': 'Latitude 5540',
  '{{serialNumber}}': 'SN123456789',
  '{{acceptanceUrl}}': '#',
}

function substituteVars(html: string): string {
  let result = html
  for (const [key, val] of Object.entries(SAMPLE_VALUES)) {
    result = result.replaceAll(key, val)
  }
  return result
}

interface Props {
  tenantId: string | null
  canEdit: boolean
  initialSubject: string
  initialBody: string
  defaultSubject: string
  defaultBody: string
  tenants?: { id: string; name: string }[]
}

export default function TemplatesClient({
  tenantId,
  canEdit,
  initialSubject,
  initialBody,
  defaultSubject,
  defaultBody,
  tenants,
}: Props) {
  const isSuperAdmin = Array.isArray(tenants)

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(tenantId)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingTemplate, startLoadingTemplate] = useTransition()

  function handleTenantChange(newTenantId: string) {
    setSelectedTenantId(newTenantId)
    setSaved(false)
    setError(null)
    startLoadingTemplate(async () => {
      const template = await getTemplate(newTenantId)
      setSubject(template?.emailSubject ?? DEFAULT_TEMPLATE_SUBJECT)
      setBody(template?.bodyHtml ?? DEFAULT_TEMPLATE_BODY)
    })
  }

  async function handleSave() {
    if (!selectedTenantId) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await saveTemplate(selectedTenantId, { subject, bodyHtml: body })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setSubject(defaultSubject)
    setBody(defaultBody)
  }

  const editorDisabled = !canEdit || !selectedTenantId || loadingTemplate

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plantillas de email</h1>
        {canEdit && selectedTenantId && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset} disabled={saving || loadingTemplate}>
              Restaurar plantilla por defecto
            </Button>
            <Button onClick={handleSave} disabled={saving || loadingTemplate}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        )}
      </div>

      {/* Tenant selector for SUPER_ADMIN */}
      {isSuperAdmin && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="tenant-select" className="shrink-0 font-medium">
              Cliente
            </Label>
            <Select
              value={selectedTenantId ?? ''}
              onValueChange={handleTenantChange}
              disabled={loadingTemplate}
            >
              <SelectTrigger id="tenant-select" className="w-72">
                <SelectValue placeholder="Seleccioná un cliente…" />
              </SelectTrigger>
              <SelectContent>
                {tenants!.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingTemplate && (
              <span className="text-sm text-muted-foreground">Cargando plantilla…</span>
            )}
          </div>
          {!selectedTenantId && (
            <p className="mt-2 text-sm text-muted-foreground">
              Seleccioná un cliente para ver y editar su plantilla de email.
            </p>
          )}
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Plantilla guardada correctamente.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Show editor only when a tenant is selected (or not in super admin mode) */}
      {(!isSuperAdmin || selectedTenantId) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Editor column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h2 className="font-semibold text-lg">Editor de plantilla</h2>

              <div className="space-y-2">
                <Label htmlFor="subject">Asunto del email</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={editorDisabled}
                  placeholder="Asunto del email…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Cuerpo del email (HTML)</Label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={editorDisabled}
                  rows={16}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  placeholder="HTML del cuerpo del email…"
                />
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-lg border bg-card p-6 space-y-3">
              <h2 className="font-semibold text-lg">Vista previa</h2>
              <p className="text-sm text-muted-foreground">
                Asunto:{' '}
                <span className="font-medium text-foreground">
                  {subject.replace(/\{\{(\w+)\}\}/g, (m) => SAMPLE_VALUES[m] ?? m)}
                </span>
              </p>
              <div
                className="rounded border bg-white p-4 text-sm"
                dangerouslySetInnerHTML={{ __html: substituteVars(body) }}
              />
            </div>
          </div>

          {/* Variables panel */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-6 space-y-3">
              <h2 className="font-semibold text-lg">Variables disponibles</h2>
              <p className="text-xs text-muted-foreground">
                Usá estas variables en el asunto o cuerpo. Serán reemplazadas al enviar el email.
              </p>
              <ul className="space-y-2">
                {VARIABLES.map(({ key, desc }) => (
                  <li key={key} className="rounded-md border bg-muted/40 px-3 py-2">
                    <code className="text-xs font-mono text-blue-700">{key}</code>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            {!canEdit && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No tenés permisos para editar la plantilla.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
