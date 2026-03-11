'use client'
import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileText, CheckCircle2, XCircle, Download, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface ImportClientProps {
  role: string
  tenantId: string
}

type ParsedRow = Record<string, string>
type ImportError = { row: number; field: string; message: string }

type Step = 'upload' | 'preview' | 'results'

function parseCsvPreview(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim())
  const rows: ParsedRow[] = []
  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const vals = lines[i].split(',')
    const row: ParsedRow = {}
    headers.forEach((h, idx) => { row[h] = vals[idx]?.trim() ?? '' })
    rows.push(row)
  }
  return { headers, rows }
}

export function ImportClient({ role, tenantId }: ImportClientProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; rows: ParsedRow[] } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ success: number; errors: ImportError[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(f: File) {
    if (!f.name.endsWith('.csv')) {
      toast.error('Solo se aceptan archivos CSV')
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCsvPreview(text)
      setPreview(parsed)
      setStep('preview')
    }
    reader.readAsText(f)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  async function handleImport() {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const url = role === 'SUPER_ADMIN'
        ? `/api/import/assets?tenantId=${tenantId}`
        : '/api/import/assets'

      const res = await fetch(url, { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Error al importar')
        return
      }

      setResults(data)
      setStep('results')

      if (data.success > 0) {
        toast.success(`${data.success} activo${data.success !== 1 ? 's' : ''} importado${data.success !== 1 ? 's' : ''} correctamente`)
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setResults(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Importar Activos</h1>
          <p className="text-muted-foreground mt-1">Carga masiva de activos desde un archivo CSV</p>
        </div>
        <a href="/api/import/assets" download="plantilla-importacion.csv">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Descargar plantilla
          </Button>
        </a>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'preview', 'results'] as Step[]).map((s, idx) => {
          const labels = ['1. Subir archivo', '2. Vista previa', '3. Resultados']
          const isActive = step === s
          const isDone = (step === 'preview' && idx === 0) || (step === 'results' && idx < 2)
          return (
            <div key={s} className="flex items-center gap-2">
              {idx > 0 && <div className="w-8 h-px bg-gray-200" />}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                isActive ? 'bg-blue-600 text-white' :
                isDone ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {labels[idx]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
          />
          <Upload className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">Arrastra tu CSV aquí</p>
          <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionar</p>
          <p className="text-xs text-muted-foreground mt-4">Solo archivos .csv</p>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-medium text-blue-900">{file?.name}</p>
              <p className="text-sm text-blue-700">Mostrando primeras {preview.rows.length} filas</p>
            </div>
          </div>

          <div className="rounded-lg border bg-white overflow-x-auto">
            <table className="text-sm w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {preview.headers.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {preview.headers.map(h => (
                      <td key={h} className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-32 truncate">{row[h] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleImport} disabled={loading}>
              {loading ? 'Importando...' : 'Iniciar importación'}
            </Button>
            <Button variant="outline" onClick={reset}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && results && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
              <div>
                <p className="text-3xl font-bold text-green-700">{results.success}</p>
                <p className="text-sm text-green-600">Activos importados</p>
              </div>
            </div>
            <div className="p-5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-4">
              <XCircle className="h-8 w-8 text-red-400 shrink-0" />
              <div>
                <p className="text-3xl font-bold text-red-600">{results.errors.length}</p>
                <p className="text-sm text-red-500">Filas con error</p>
              </div>
            </div>
          </div>

          {/* Error details */}
          {results.errors.length > 0 && (
            <div className="rounded-lg border bg-white overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-700">Errores de importación</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Fila</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Campo</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.errors.map((err, i) => (
                    <tr key={i} className="hover:bg-red-50">
                      <td className="px-4 py-2 font-mono text-red-600">{err.row}</td>
                      <td className="px-4 py-2 font-mono text-gray-700">{err.field}</td>
                      <td className="px-4 py-2 text-gray-700">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={reset}>Nueva importación</Button>
            <a href="/assets"><Button variant="outline">Ver activos</Button></a>
          </div>
        </div>
      )}

      {/* Instructions */}
      {step === 'upload' && (
        <div className="rounded-lg border bg-gray-50 p-5 space-y-3">
          <h3 className="font-semibold text-gray-700">Instrucciones</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Descarga la plantilla CSV con el botón superior</li>
            <li>Completa los datos — <strong>assetTag</strong> y <strong>assetTypeId</strong> son obligatorios</li>
            <li>Los campos de ID (assetTypeId, brandId, modelId, locationId) aceptan nombre o UUID</li>
            <li>Estado por defecto: AVAILABLE | Condición por defecto: GOOD</li>
            <li>Valores de estado válidos: AVAILABLE, ASSIGNED, IN_REPAIR, DECOMMISSIONED, OBSOLETE</li>
            <li>Valores de condición válidos: NEW, GOOD, FAIR, POOR, DAMAGED</li>
            <li>Fechas en formato YYYY-MM-DD</li>
          </ul>
        </div>
      )}
    </div>
  )
}
