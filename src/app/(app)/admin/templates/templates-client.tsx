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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  saveTemplate,
  getEmailTemplate,
  savePdfTemplate,
  getPdfTemplate,
} from '@/lib/actions/templates'
import {
  DEFAULT_PDF_CLAUSES,
  DEFAULT_PDF_WARNING,
  DEFAULT_PDF_TITLE,
} from '@/lib/pdf-template-defaults'
import { DEFAULT_EMAIL_SUBJECT, DEFAULT_EMAIL_BODY } from '@/lib/email-defaults'

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

type EmailTemplateRow = {
  emailSubject: string
  bodyHtml: string
} | null

type PdfTemplateRow = {
  title: string
  clauses: unknown
  warning: string
} | null

interface Props {
  emailTemplate: EmailTemplateRow
  pdfTemplate: PdfTemplateRow
  tenants: Array<{ id: string; name: string }>
  currentTenantId: string | null
  role: string
}

export function TemplatesClient({
  emailTemplate,
  pdfTemplate,
  tenants,
  currentTenantId,
  role,
}: Props) {
  const isSuperOrInternal = role === 'SUPER_ADMIN' || role === 'INTERNAL_ADMIN'
  const canEdit = isSuperOrInternal

  // Tenant selector state (for SUPER_ADMIN / INTERNAL_ADMIN)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(currentTenantId)
  const [loadingTemplates, startLoadingTemplates] = useTransition()

  // Email template state
  const [emailSubject, setEmailSubject] = useState(emailTemplate?.emailSubject ?? DEFAULT_EMAIL_SUBJECT)
  const [emailBody, setEmailBody] = useState(emailTemplate?.bodyHtml ?? DEFAULT_EMAIL_BODY)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savedEmail, setSavedEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // PDF template state
  const parsedClauses = (() => {
    if (!pdfTemplate?.clauses) return DEFAULT_PDF_CLAUSES
    try {
      const c = pdfTemplate.clauses as Array<{ title: string; body: string }>
      if (Array.isArray(c)) return c
      return DEFAULT_PDF_CLAUSES
    } catch {
      return DEFAULT_PDF_CLAUSES
    }
  })()

  const [pdfTitle, setPdfTitle] = useState(pdfTemplate?.title ?? DEFAULT_PDF_TITLE)
  const [pdfClauses, setPdfClauses] = useState<Array<{ title: string; body: string }>>(parsedClauses)
  const [pdfWarning, setPdfWarning] = useState(pdfTemplate?.warning ?? DEFAULT_PDF_WARNING)
  const [savingPdf, setSavingPdf] = useState(false)
  const [savedPdf, setSavedPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  function handleTenantChange(newTenantId: string) {
    setSelectedTenantId(newTenantId)
    setSavedEmail(false)
    setSavedPdf(false)
    setEmailError(null)
    setPdfError(null)
    startLoadingTemplates(async () => {
      const [et, pt] = await Promise.all([
        getEmailTemplate(newTenantId),
        getPdfTemplate(newTenantId),
      ])
      setEmailSubject(et?.emailSubject ?? DEFAULT_EMAIL_SUBJECT)
      setEmailBody(et?.bodyHtml ?? DEFAULT_EMAIL_BODY)
      setPdfTitle(pt?.title ?? DEFAULT_PDF_TITLE)
      setPdfWarning(pt?.warning ?? DEFAULT_PDF_WARNING)
      const c = pt?.clauses
      if (c && Array.isArray(c)) {
        setPdfClauses(c as Array<{ title: string; body: string }>)
      } else {
        setPdfClauses(DEFAULT_PDF_CLAUSES)
      }
    })
  }

  async function handleSaveEmail() {
    if (!selectedTenantId) return
    setSavingEmail(true)
    setEmailError(null)
    setSavedEmail(false)
    try {
      await saveTemplate(selectedTenantId, { subject: emailSubject, bodyHtml: emailBody })
      setSavedEmail(true)
      setTimeout(() => setSavedEmail(false), 3000)
    } catch (e: unknown) {
      setEmailError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingEmail(false)
    }
  }

  function handleResetEmail() {
    setEmailSubject(DEFAULT_EMAIL_SUBJECT)
    setEmailBody(DEFAULT_EMAIL_BODY)
  }

  async function handleSavePdf() {
    if (!selectedTenantId) return
    setSavingPdf(true)
    setPdfError(null)
    setSavedPdf(false)
    try {
      await savePdfTemplate(selectedTenantId, {
        title: pdfTitle,
        clauses: pdfClauses,
        warning: pdfWarning,
      })
      setSavedPdf(true)
      setTimeout(() => setSavedPdf(false), 3000)
    } catch (e: unknown) {
      setPdfError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingPdf(false)
    }
  }

  function handleResetPdf() {
    setPdfTitle(DEFAULT_PDF_TITLE)
    setPdfClauses(DEFAULT_PDF_CLAUSES)
    setPdfWarning(DEFAULT_PDF_WARNING)
  }

  function updateClause(idx: number, field: 'title' | 'body', value: string) {
    setPdfClauses(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  function removeClause(idx: number) {
    setPdfClauses(prev => prev.filter((_, i) => i !== idx))
  }

  function addClause() {
    setPdfClauses(prev => [...prev, { title: '', body: '' }])
  }

  const tenantSelectorDisabled = loadingTemplates

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plantillas</h1>
      </div>

      {/* Tenant selector for SUPER_ADMIN / INTERNAL_ADMIN */}
      {isSuperOrInternal && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="tenant-select" className="shrink-0 font-medium">
              Cliente
            </Label>
            <Select
              value={selectedTenantId ?? ''}
              onValueChange={handleTenantChange}
              disabled={tenantSelectorDisabled}
            >
              <SelectTrigger id="tenant-select" className="w-72">
                <SelectValue placeholder="Seleccioná un cliente…" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingTemplates && (
              <span className="text-sm text-muted-foreground">Cargando plantillas…</span>
            )}
          </div>
          {!selectedTenantId && (
            <p className="mt-2 text-sm text-muted-foreground">
              Seleccioná un cliente para ver y editar sus plantillas.
            </p>
          )}
        </div>
      )}

      {(!isSuperOrInternal || selectedTenantId) && (
        <Tabs defaultValue="email">
          <TabsList>
            <TabsTrigger value="email">✉️ Email de Aceptación</TabsTrigger>
            <TabsTrigger value="pdf">📄 Documento PDF</TabsTrigger>
          </TabsList>

          {/* ─── EMAIL TAB ─────────────────────────────────────────── */}
          <TabsContent value="email" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {canEdit && selectedTenantId && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      onClick={handleResetEmail}
                      disabled={savingEmail || loadingTemplates}
                    >
                      Restaurar por defecto
                    </Button>
                    <Button
                      onClick={handleSaveEmail}
                      disabled={savingEmail || loadingTemplates}
                    >
                      {savingEmail ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                  </div>
                )}
              </div>

              {savedEmail && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  Plantilla de email guardada correctamente.
                </div>
              )}
              {emailError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {emailError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-lg border bg-card p-6 space-y-4">
                    <h2 className="font-semibold text-lg">Editor de plantilla</h2>
                    <div className="space-y-2">
                      <Label htmlFor="email-subject">Asunto del email</Label>
                      <Input
                        id="email-subject"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        disabled={!canEdit || !selectedTenantId || loadingTemplates}
                        placeholder="Asunto del email…"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-body">Cuerpo del email (HTML)</Label>
                      <textarea
                        id="email-body"
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        disabled={!canEdit || !selectedTenantId || loadingTemplates}
                        rows={16}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        placeholder="HTML del cuerpo del email…"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-6 space-y-3">
                    <h2 className="font-semibold text-lg">Vista previa</h2>
                    <p className="text-sm text-muted-foreground">
                      Asunto:{' '}
                      <span className="font-medium text-foreground">
                        {emailSubject.replace(/\{\{(\w+)\}\}/g, (m) => SAMPLE_VALUES[m] ?? m)}
                      </span>
                    </p>
                    <div
                      className="rounded border bg-white p-4 text-sm"
                      dangerouslySetInnerHTML={{ __html: substituteVars(emailBody) }}
                    />
                  </div>
                </div>

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
            </div>
          </TabsContent>

          {/* ─── PDF TAB ────────────────────────────────────────────── */}
          <TabsContent value="pdf" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {canEdit && selectedTenantId && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      onClick={handleResetPdf}
                      disabled={savingPdf || loadingTemplates}
                    >
                      Restaurar por defecto
                    </Button>
                    <Button
                      onClick={handleSavePdf}
                      disabled={savingPdf || loadingTemplates}
                    >
                      {savingPdf ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                  </div>
                )}
              </div>

              {savedPdf && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  Plantilla PDF guardada correctamente.
                </div>
              )}
              {pdfError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {pdfError}
                </div>
              )}

              <div className="rounded-lg border bg-card p-6 space-y-4">
                <h2 className="font-semibold text-lg">Configuración del documento PDF</h2>
                <p className="text-sm text-muted-foreground">
                  Este documento se adjunta automáticamente al email de aceptación enviado al receptor del activo.
                </p>

                {/* Document title */}
                <div className="space-y-2">
                  <Label htmlFor="pdf-title">Título del documento</Label>
                  <Input
                    id="pdf-title"
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    disabled={!canEdit || !selectedTenantId || loadingTemplates}
                    placeholder="Título del documento PDF…"
                  />
                </div>

                {/* Clauses */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Cláusulas del documento</Label>
                    {canEdit && selectedTenantId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addClause}
                        disabled={loadingTemplates}
                      >
                        + Agregar cláusula
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {pdfClauses.map((clause, idx) => (
                      <div key={idx} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-muted-foreground pt-1 shrink-0">
                            {idx + 1}.
                          </span>
                          <div className="flex-1 space-y-2">
                            <Input
                              value={clause.title}
                              onChange={(e) => updateClause(idx, 'title', e.target.value)}
                              disabled={!canEdit || !selectedTenantId || loadingTemplates}
                              placeholder="Título de la cláusula…"
                              className="font-medium"
                            />
                            <textarea
                              value={clause.body}
                              onChange={(e) => updateClause(idx, 'body', e.target.value)}
                              disabled={!canEdit || !selectedTenantId || loadingTemplates}
                              rows={3}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                              placeholder="Texto de la cláusula…"
                            />
                          </div>
                          {canEdit && selectedTenantId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeClause(idx)}
                              disabled={loadingTemplates}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {pdfClauses.length === 0 && (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No hay cláusulas. Agregá al menos una para generar el documento.
                      </div>
                    )}
                  </div>
                </div>

                {/* Warning text */}
                <div className="space-y-2">
                  <Label htmlFor="pdf-warning">Texto de advertencia final</Label>
                  <textarea
                    id="pdf-warning"
                    value={pdfWarning}
                    onChange={(e) => setPdfWarning(e.target.value)}
                    disabled={!canEdit || !selectedTenantId || loadingTemplates}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    placeholder="Texto de advertencia al pie del documento…"
                  />
                </div>
              </div>

              {!canEdit && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No tenés permisos para editar la plantilla PDF.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
