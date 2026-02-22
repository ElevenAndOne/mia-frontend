import { useState } from 'react'
import { Modal } from '../../overlay'
import type { Workspace } from '../types'

interface DeleteWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  workspace: Workspace
  onConfirm: () => Promise<boolean>
}

export const DeleteWorkspaceModal = ({
  isOpen,
  onClose,
  workspace,
  onConfirm,
}: DeleteWorkspaceModalProps) => {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConfirmValid = confirmText === workspace.name

  const handleDelete = async () => {
    if (!isConfirmValid) return

    setIsDeleting(true)
    setError(null)

    try {
      const success = await onConfirm()
      if (success) {
        onClose()
      } else {
        setError('Failed to delete workspace. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    setConfirmText('')
    setError(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Workspace"
      size="md"
      closeOnOverlayClick={!isDeleting}
      closeOnEscape={!isDeleting}
      showCloseButton={!isDeleting}
      panelClassName="overflow-hidden"
    >
      <div className="px-6 py-5">
        <div className="bg-error-primary border border-error-subtle rounded-xl p-4 mb-4">
          <p className="paragraph-sm text-error">
            This action cannot be undone. This will permanently delete the workspace
            <span className="font-semibold"> {workspace.name}</span>, all its settings,
            and remove all members.
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="confirm-delete" className="block subheading-md text-secondary mb-1.5">
            Type <span className="font-semibold text-primary">{workspace.name}</span> to confirm
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value)
              setError(null)
            }}
            placeholder={workspace.name}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-error focus:border-transparent transition-all ${
              error ? 'border-error-subtle bg-error-primary' : 'border-secondary'
            }`}
            autoFocus
            disabled={isDeleting}
          />
          {error && <p className="mt-1.5 paragraph-sm text-error">{error}</p>}
        </div>
      </div>

      <div className="px-6 py-4 bg-secondary border-t border-tertiary flex justify-end gap-3">
        <button
          onClick={handleClose}
          data-track-id="workspace-delete-cancel"
          disabled={isDeleting}
          className="px-4 py-2 subheading-md text-secondary hover:bg-tertiary rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          data-track-id="workspace-delete-confirm"
          disabled={isDeleting || !isConfirmValid}
          className="px-4 py-2 subheading-md text-white bg-error hover:bg-error/90 disabled:bg-disabled disabled:text-disable disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
        >
          {isDeleting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Deleting...
            </>
          ) : (
            'Delete Workspace'
          )}
        </button>
      </div>
    </Modal>
  )
}
