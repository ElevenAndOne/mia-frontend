import { useState, useEffect } from 'react'
import { Modal } from '../../overlay'

interface RenameWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  currentName: string
  onConfirm: (newName: string) => Promise<boolean>
  renaming: boolean
}

export const RenameWorkspaceModal = ({
  isOpen,
  onClose,
  currentName,
  onConfirm,
  renaming,
}: RenameWorkspaceModalProps) => {
  const [name, setName] = useState(currentName)

  useEffect(() => {
    if (isOpen) {
      setName(currentName)
    }
  }, [isOpen, currentName])

  const isValid = name.trim().length > 0 && name.trim() !== currentName

  const handleSubmit = async () => {
    if (!isValid) return
    await onConfirm(name.trim())
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rename Workspace"
      size="md"
      closeOnOverlayClick={!renaming}
      closeOnEscape={!renaming}
      showCloseButton={!renaming}
      panelClassName="overflow-hidden"
    >
      <div className="px-6 py-5">
        <div className="mb-4">
          <label htmlFor="workspace-name" className="block subheading-md text-secondary mb-1.5">
            Workspace name
          </label>
          <input
            id="workspace-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid && !renaming) {
                handleSubmit()
              }
            }}
            placeholder="Enter workspace name"
            className="w-full px-4 py-3 border border-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            autoFocus
            disabled={renaming}
          />
        </div>
      </div>

      <div className="px-6 py-4 bg-secondary border-t border-tertiary flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={renaming}
          className="px-4 py-2 subheading-md text-secondary hover:bg-tertiary rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={renaming || !isValid}
          className="px-4 py-2 subheading-md text-primary-onbrand bg-brand-solid hover:bg-brand-solid-hover disabled:bg-disabled disabled:text-disable disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
        >
          {renaming ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Renaming...
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </Modal>
  )
}
