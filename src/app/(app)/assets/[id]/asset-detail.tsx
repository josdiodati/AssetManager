'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge, ConditionBadge } from '@/components/ui/status-badge'
import { ModalForm } from '@/components/ui/modal-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Pencil, UserPlus, UserMinus, CheckCircle, XCircle, Mail, QrCode, Printer , FileText, ArchiveX } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { assignAsset, unassignAsset, approveAssignment, rejectAssignment } from '@/lib/actions/assignments'
import { generateAcceptanceToken } from '@/lib/actions/acceptance'
import { toast } from 'sonner'
import { decommissionAsset } from '@/lib/actions/assets'
import QRCodeLib from 'qrcode'

type Person = { id: string; name: string; email: string; area: string | null; position: string | null }

type Asset = {
  id: string; assetTag: string; qrToken: string | null; status: string; condition: string;
  serialNumber: string | null; description: string | null;
  assignedArea: string | null; createdAt: Date; updatedAt: Date;
  requiresApproval: boolean; approvalStatus: string; acceptanceStatus: string;
  hostname: string | null; os: string | null; cpu: string | null; ram: string | null;
  storageCapacity: string | null; ipAddress: string | null; macAddress: string | null;
  firmwareVersion: string | null; antivirus: string | null;
  warrantyExpiresAt: Date | null; eolDate: Date | null;
  providerName: string | null; providerTaxId: string | null;
  invoiceNumber: string | null; invoiceDate: Date | null; repairNote: string | null;
  tenantId: string;
  assetType: { name: string; category: { code: string; name: string } | null } | null;
  brand: { name: string } | null;
  model: { name: string } | null;
  assignedPerson: { id: string; name: string; email: string } | null;
  location: { site: string; area: string | null; detail: string | null } | null;
  createdBy: { name: string; email: string } | null;
  assignmentHistory: {
    id: string; action: string; createdAt: Date;
    fromPerson: { name: string } | null;
    toPerson: { name: string } | null;
    performedBy: { name: string } | null;
    notes: string | null;
  }[];
  approvalEvents: {
    id: string; action: string; comment: string | null; createdAt: Date;
    performedBy: { name: string } | null;
  }[];
  documents?: {
    id: string; type: string; filename: string; mimeType: string;
    createdAt: Date; metadata: any;
  }[];
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function fmt(date?: Date | null) {
  if (!date) return null
  return format(new Date(date), 'dd/MM/yyyy', { locale: es })
}

const actionLabels: Record<string, string> = {
  ASSIGNED: 'Asignado', UNASSIGNED: 'Desasignado', REASSIGNED: 'Reasignado',
  SUBMITTED: 'Enviado para aprobación', APPROVED: 'Aprobado', REJECTED: 'Rechazado',
}

const approvalStatusLabels: Record<string, string> = {
  NOT_REQUIRED: '—', PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazado',
}

const acceptanceStatusLabels: Record<string, string> = {
  NOT_SENT: '—', PENDING: 'Pendiente', ACCEPTED: 'Aceptado', REJECTED: 'Rechazado',
}

export function AssetDetail({ asset, currentRole, persons }: {
  asset: Asset; currentRole: string; persons: Person[]
}) {
  const router = useRouter()
  const canEdit = currentRole !== 'CLIENT_ADMIN'

  // Assignment modal
  const [assignModal, setAssignModal] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [assignNotes, setAssignNotes] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)

  // Unassign modal
  const [unassignModal, setUnassignModal] = useState(false)
  const [unassignNotes, setUnassignNotes] = useState('')
  const [unassignLoading, setUnassignLoading] = useState(false)

  // Approval modal
  const [approveModal, setApproveModal] = useState(false)
  const [approveComment, setApproveComment] = useState('')
  const [approveLoading, setApproveLoading] = useState(false)

  // Reject modal
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  // Acceptance
  const [sendingAcceptance, setSendingAcceptance] = useState(false)

  // QR modal
  const [qrModal, setQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  // Decommission
  const [decommissionLoading, setDecommissionLoading] = useState(false)

  useEffect(() => {
    if (qrModal && !qrDataUrl) {
      const baseUrl = 'https://acceptance.kawellu.com.ar'
      const text = asset.qrToken ? baseUrl + '/asset/' + asset.qrToken : asset.assetTag
      QRCodeLib.toDataURL(text, { width: 256, margin: 2, errorCorrectionLevel: 'M' })
        .then(url => setQrDataUrl(url))
        .catch(() => {})
    }
  }, [qrModal, qrDataUrl, asset.assetTag, asset.serialNumber])

  async function handleAssign() {
    if (!selectedPersonId) { toast.error('Seleccioná una persona'); return }
    setAssignLoading(true)
    try {
      const result = await assignAsset(asset.id, selectedPersonId, assignNotes || undefined)
      toast.success(result.requiresApproval ? 'Asignación enviada para aprobación' : 'Activo asignado correctamente')
      setAssignModal(false)
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setAssignLoading(false) }
  }

  async function handleUnassign() {
    setUnassignLoading(true)
    try {
      await unassignAsset(asset.id, unassignNotes || undefined)
      toast.success('Activo desasignado')
      setUnassignModal(false)
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setUnassignLoading(false) }
  }

  async function handleApprove() {
    setApproveLoading(true)
    try {
      await approveAssignment(asset.id, approveComment || undefined)
      toast.success('Asignación aprobada')
      setApproveModal(false)
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setApproveLoading(false) }
  }

  async function handleReject() {
    if (!rejectComment.trim()) { toast.error('El motivo de rechazo es obligatorio'); return }
    setRejectLoading(true)
    try {
      await rejectAssignment(asset.id, rejectComment)
      toast.success('Asignación rechazada')
      setRejectModal(false)
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setRejectLoading(false) }
  }

  async function handleDecommission() {
    if (!confirm(`¿Decomisionar el activo ${asset.assetTag}? Esta acción lo desactivará y lo quitará de la vista normal.`)) return
    setDecommissionLoading(true)
    try {
      await decommissionAsset(asset.id)
      toast.success('Activo decomisionado')
      router.push('/assets')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Error al decomisionar')
    } finally {
      setDecommissionLoading(false)
    }
  }

  async function handleSendAcceptance() {
    if (!confirm(`¿Enviar email de aceptación a ${asset.assignedPerson?.name}?`)) return
    setSendingAcceptance(true)
    try {
      const result = await generateAcceptanceToken(asset.id)
      toast.success(`Email enviado a ${result.sentTo}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Error al enviar')
    } finally {
      setSendingAcceptance(false)
    }
  }

  const canAssign = canEdit && (asset.status === 'AVAILABLE' || asset.status === 'IN_REPAIR')
  const canUnassign = canEdit && (asset.status === 'ASSIGNED' || asset.status === 'PENDING_APPROVAL')
  const canApproveReject = canEdit && asset.status === 'PENDING_APPROVAL'
  const canDecommission = canEdit && !asset.assignedPerson && asset.status !== 'DECOMMISSIONED'

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/assets">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Activos</Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{asset.assetTag}</h1>
              <StatusBadge status={asset.status} />
              <ConditionBadge condition={asset.condition} />
            </div>
            <p className="text-muted-foreground mt-1">{asset.assetType?.name ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canApproveReject && (
            <>
              <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => { setApproveComment(''); setApproveModal(true) }}>
                <CheckCircle className="h-4 w-4 mr-1" />Aprobar
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => { setRejectComment(''); setRejectModal(true) }}>
                <XCircle className="h-4 w-4 mr-1" />Rechazar
              </Button>
            </>
          )}
          {canUnassign && (
            <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => { setUnassignNotes(''); setUnassignModal(true) }}>
              <UserMinus className="h-4 w-4 mr-1" />Desasignar
            </Button>
          )}
          {canEdit && asset.status === 'ASSIGNED' && asset.assignedPerson && (() => {
            const as = asset.acceptanceStatus
            if (as === 'ACCEPTED') return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle className="h-4 w-4" />Aceptado por usuario
              </span>
            )
            if (as === 'REJECTED') return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                <XCircle className="h-4 w-4" />Rechazado por usuario
              </span>
            )
            if (as === 'PENDING') return (
              <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50" onClick={handleSendAcceptance} disabled={sendingAcceptance}>
                <Mail className="h-4 w-4 mr-1" />{sendingAcceptance ? 'Enviando...' : 'Reenviar aceptación'}
              </Button>
            )
            return (
              <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50" onClick={handleSendAcceptance} disabled={sendingAcceptance}>
                <Mail className="h-4 w-4 mr-1" />{sendingAcceptance ? 'Enviando...' : 'Enviar aceptación'}
              </Button>
            )
          })()}
          {canAssign && (
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => { setSelectedPersonId(''); setAssignNotes(''); setAssignModal(true) }}>
              <UserPlus className="h-4 w-4 mr-1" />Asignar
            </Button>
          )}
          {/* QR button */}
          <Button variant="outline" size="sm" onClick={() => { setQrDataUrl(''); setQrModal(true) }}>
            <QrCode className="h-4 w-4 mr-1" />QR
          </Button>
          {canDecommission && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleDecommission}
              disabled={decommissionLoading}
            >
              <ArchiveX className="h-4 w-4 mr-1" />{decommissionLoading ? 'Decomisionando...' : 'Decomisionar'}
            </Button>
          )}
          {canEdit && (
            <Link href={`/assets/${asset.id}/edit`}>
              <Button variant="outline"><Pencil className="h-4 w-4 mr-2" />Editar</Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Datos Generales</TabsTrigger>
          <TabsTrigger value="technical">Datos Técnicos</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* TAB 1: GENERAL */}
        <TabsContent value="general">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Identificación</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="Asset Tag" value={asset.assetTag} />
                <Field label="Número de Serie" value={asset.serialNumber} />
                <Field label="Tipo" value={asset.assetType?.name} />
                <Field label="Marca" value={asset.brand?.name} />
                <Field label="Modelo" value={asset.model?.name} />
                <Field label="Descripción" value={asset.description} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Asignación</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="Persona Asignada" value={asset.assignedPerson?.name} />
                <Field label="Email" value={asset.assignedPerson?.email} />
                <Field label="Área" value={asset.assignedArea} />
                <Field label="Ubicación" value={asset.location ? `${asset.location.site}${asset.location.area ? ` / ${asset.location.area}` : ''}` : null} />
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Requiere Aprobación</p>
                  <p className="text-sm font-medium">{asset.requiresApproval ? 'Sí' : 'No'}</p>
                </div>
                {asset.requiresApproval && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Estado Aprobación</p>
                    <p className="text-sm font-medium">{approvalStatusLabels[asset.approvalStatus] ?? asset.approvalStatus}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Estado Aceptación</p>
                  <p className="text-sm font-medium">{acceptanceStatusLabels[asset.acceptanceStatus] ?? asset.acceptanceStatus}</p>
                </div>
              </CardContent>
            </Card>

            {asset.repairNote && (
              <Card className="col-span-2">
                <CardHeader><CardTitle className="text-base text-orange-700">Nota de Reparación</CardTitle></CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap font-sans">{asset.repairNote}</pre>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Proveedor / Compra</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="Proveedor" value={asset.providerName} />
                <Field label="CUIT" value={asset.providerTaxId} />
                <Field label="N° Factura" value={asset.invoiceNumber} />
                <Field label="Fecha Factura" value={fmt(asset.invoiceDate)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Fechas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="Alta en sistema" value={fmt(asset.createdAt)} />
                <Field label="Última modificación" value={fmt(asset.updatedAt)} />
                <Field label="Garantía hasta" value={fmt(asset.warrantyExpiresAt)} />
                <Field label="EOL" value={fmt(asset.eolDate)} />
                <Field label="Creado por" value={asset.createdBy?.name} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: TECHNICAL */}
        <TabsContent value="technical">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Hostname" value={asset.hostname} />
                <Field label="Sistema Operativo" value={asset.os} />
                <Field label="CPU" value={asset.cpu} />
                <Field label="RAM" value={asset.ram} />
                <Field label="Almacenamiento" value={asset.storageCapacity} />
                <Field label="IP" value={asset.ipAddress} />
                <Field label="MAC Address" value={asset.macAddress} />
                <Field label="Firmware" value={asset.firmwareVersion} />
                <Field label="Antivirus" value={asset.antivirus} />
              </div>
              {!asset.hostname && !asset.os && !asset.cpu && !asset.ram && !asset.ipAddress && !asset.macAddress && (
                <p className="text-center text-muted-foreground py-8 text-sm">Sin datos técnicos registrados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: HISTORY */}
        <TabsContent value="history">
          <div className="space-y-4">
            {asset.assignmentHistory.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Historial de Asignaciones</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {asset.assignmentHistory.map(h => (
                      <div key={h.id} className="flex items-start gap-3 text-sm border-b last:border-0 pb-3 last:pb-0">
                        <div className="flex-1">
                          <span className="font-medium">{actionLabels[h.action] ?? h.action}</span>
                          {h.toPerson && <span className="text-muted-foreground"> → {h.toPerson.name}</span>}
                          {h.fromPerson && h.action === 'UNASSIGNED' && <span className="text-muted-foreground"> (de {h.fromPerson.name})</span>}
                          {h.notes && <p className="text-muted-foreground text-xs mt-0.5">{h.notes}</p>}
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <p>{fmt(h.createdAt)}</p>
                          {h.performedBy && <p>{h.performedBy.name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {asset.approvalEvents.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Historial de Aprobaciones</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {asset.approvalEvents.map(e => (
                      <div key={e.id} className="flex items-start gap-3 text-sm border-b last:border-0 pb-3 last:pb-0">
                        <div className="flex-1">
                          <span className="font-medium">{actionLabels[e.action] ?? e.action}</span>
                          {e.comment && <p className="text-muted-foreground text-xs mt-0.5">{e.comment}</p>}
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <p>{fmt(e.createdAt)}</p>
                          {e.performedBy && <p>{e.performedBy.name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}


            {asset.documents && asset.documents.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" />Documentos</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {asset.documents.map((doc: any) => {
                      const meta = doc.metadata as any
                      return (
                        <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors">
                          <FileText className="h-8 w-8 text-red-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.type === 'ACCEPTANCE' ? 'Constancia de Aceptación' : doc.type}
                              {meta?.personName && <span> — {meta.personName}</span>}
                            </p>
                            {meta?.constanciaId && (
                              <p className="text-xs font-mono text-gray-400 mt-0.5">ID: {meta.constanciaId}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground mb-1">{fmt(doc.createdAt)}</p>
                            <a
                              href={`/api/documents/${doc.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Ver PDF
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {asset.assignmentHistory.length === 0 && asset.approvalEvents.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">Sin historial registrado</CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ASSIGN MODAL */}
      <ModalForm
        open={assignModal}
        onClose={() => setAssignModal(false)}
        title="Asignar Activo"
        onSubmit={handleAssign}
        loading={assignLoading}
        submitLabel="Asignar"
      >
        {asset.requiresApproval && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
            Este activo requiere aprobación. La asignación quedará pendiente hasta ser aprobada.
          </div>
        )}
        <div className="space-y-2">
          <Label>Persona *</Label>
          <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger>
            <SelectContent>
              {persons.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}{p.area ? ` — ${p.area}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Notas (opcional)</Label>
          <Input value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Motivo de la asignación..." />
        </div>
      </ModalForm>

      {/* UNASSIGN MODAL */}
      <ModalForm
        open={unassignModal}
        onClose={() => setUnassignModal(false)}
        title="Desasignar Activo"
        onSubmit={handleUnassign}
        loading={unassignLoading}
        submitLabel="Desasignar"
      >
        <p className="text-sm text-muted-foreground">
          Se desasignará <span className="font-medium text-foreground">{asset.assignedPerson?.name ?? 'la persona actual'}</span> del activo {asset.assetTag}.
        </p>
        <div className="space-y-2">
          <Label>Motivo (opcional)</Label>
          <Input value={unassignNotes} onChange={e => setUnassignNotes(e.target.value)} placeholder="Motivo de la desasignación..." />
        </div>
      </ModalForm>

      {/* APPROVE MODAL */}
      <ModalForm
        open={approveModal}
        onClose={() => setApproveModal(false)}
        title="Aprobar Asignación"
        onSubmit={handleApprove}
        loading={approveLoading}
        submitLabel="Aprobar"
      >
        <p className="text-sm text-muted-foreground">
          Se aprobará la asignación de <span className="font-medium text-foreground">{asset.assignedPerson?.name}</span> al activo {asset.assetTag}.
        </p>
        <div className="space-y-2">
          <Label>Comentario (opcional)</Label>
          <Input value={approveComment} onChange={e => setApproveComment(e.target.value)} placeholder="Comentario de aprobación..." />
        </div>
      </ModalForm>

      {/* REJECT MODAL */}
      <ModalForm
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Rechazar Asignación"
        onSubmit={handleReject}
        loading={rejectLoading}
        submitLabel="Rechazar"
      >
        <p className="text-sm text-muted-foreground">
          Se rechazará la asignación de <span className="font-medium text-foreground">{asset.assignedPerson?.name}</span>. El activo volverá a estar disponible.
        </p>
        <div className="space-y-2">
          <Label>Motivo de rechazo *</Label>
          <Input value={rejectComment} onChange={e => setRejectComment(e.target.value)} placeholder="Ingresá el motivo..." />
        </div>
      </ModalForm>

      {/* QR MODAL */}
      <Dialog open={qrModal} onOpenChange={setQrModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Código QR — {asset.assetTag}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Generando...</span>
              </div>
            )}
            <p className="font-mono text-lg font-bold">{asset.assetTag}</p>
            {asset.serialNumber && (
              <p className="text-sm text-muted-foreground">S/N: {asset.serialNumber}</p>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(`/print/assets/${asset.id}/label`, '_blank')}
            >
              <Printer className="h-4 w-4 mr-2" />Imprimir etiqueta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
