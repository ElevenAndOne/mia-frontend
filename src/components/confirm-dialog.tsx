import { Modal } from '../features/overlay'
import { Button } from './button'

interface ConfirmDialogProps {
  isOpen: boolean
  message: string
  confirmLabel?: string
  /** 'danger' (default) for a delete or anything hard to undo; 'primary' for a plain yes. */
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reusable confirmation dialog — replaces native confirm() calls.
 * Renders via the overlay portal with focus trapping and escape-to-cancel.
 */
export function ConfirmDialog({
  isOpen,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={true}
    >
      <div className="p-6 space-y-5">
        <p className="paragraph-md text-primary">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={confirmVariant} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
