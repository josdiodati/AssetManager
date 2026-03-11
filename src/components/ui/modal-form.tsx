'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ModalFormProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onSubmit?: () => void
  loading?: boolean
  submitLabel?: string
}

export function ModalForm({ open, onClose, title, children, onSubmit, loading, submitLabel = 'Guardar' }: ModalFormProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">{children}</div>
        {onSubmit && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={onSubmit} disabled={loading}>{loading ? 'Guardando...' : submitLabel}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
