import { useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { Modal } from '../../overlay'

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  defaultName?: string
  onSuccess?: (tenantId: string) => void
  required?: boolean // If true, user cannot dismiss the modal without creating
}

const CreateWorkspaceModal = ({
  isOpen,
  onClose,
  defaultName = '',
  onSuccess,
  required = false,
}: CreateWorkspaceModalProps) => {
  const { createWorkspace, logout } = useSession()

  const [workspaceName, setWorkspaceName] = useState(defaultName)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      window.location.href = '/'
    } catch (err) {
      console.error('[CREATE-WORKSPACE] Logout error:', err)
      setIsLoggingOut(false)
    }
  }

  const handleCreate = async () => {
    if (!workspaceName.trim()) {
      setError('Please enter a workspace name')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const workspace = await createWorkspace(workspaceName.trim())
      if (workspace) {
        console.log('[CREATE-WORKSPACE] Created:', workspace.tenant_id)
        onSuccess?.(workspace.tenant_id)
        onClose()
      } else {
        setError('Failed to create workspace. Please try again.')
      }
    } catch (error) {
      console.error('[CREATE-WORKSPACE] Error:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={required ? 'Create Your First Workspace' : 'Create Workspace'}
      size="md"
      closeOnOverlayClick={!required}
      closeOnEscape={!required}
      showCloseButton={!required}
      panelClassName="overflow-hidden"
    >
      {/* Content */}
      <div className="px-6 py-5">
        <p className="paragraph-sm text-tertiary mb-4">
          {required
            ? 'Name your workspace to get started. You can invite team members later.'
            : 'Create a workspace to organize your marketing data and collaborate with your team.'}
        </p>

        {/* Workspace Name Input */}
        <div className="mb-4">
          <label htmlFor="workspace-name" className="block subheading-md text-secondary mb-1.5">
            Workspace Name
          </label>
          <input
            id="workspace-name"
            type="text"
            value={workspaceName}
            onChange={(e) => {
              setWorkspaceName(e.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., My Agency, Client Name"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-utility-info-500 focus:border-transparent transition-all ${
              error ? 'border-error-subtle bg-error-primary' : 'border-secondary'
            }`}
            autoFocus
            disabled={isCreating}
          />
          {error && <p className="mt-1.5 paragraph-sm text-error">{error}</p>}
        </div>

        {/* Features Preview */}
        <div className="bg-secondary rounded-xl p-4 mb-2">
          <h4 className="subheading-md text-secondary mb-2">What you get:</h4>
          <ul className="space-y-2 paragraph-sm text-tertiary">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Shared platform connections
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Team collaboration
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Role-based access control
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-secondary border-t border-tertiary flex justify-between items-center">
        {/* Left side - logout option when required (always available as escape hatch) */}
        <div>
          {required && (
            <button
              type="button"
              onClick={handleLogout}
              data-track-id="workspace-create-use-different-account"
              disabled={isCreating || isLoggingOut}
              className="px-3 py-2 paragraph-sm text-tertiary hover:text-secondary transition-colors"
            >
              {isLoggingOut ? 'Signing out...' : 'Use different account'}
            </button>
          )}
        </div>

        {/* Right side - action buttons */}
        <div className="flex gap-3">
          {!required && (
            <button
              onClick={onClose}
              data-track-id="workspace-create-cancel"
              disabled={isCreating}
              className="px-4 py-2 subheading-md text-secondary hover:bg-tertiary rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleCreate}
            data-track-id="workspace-create-submit"
            disabled={isCreating || isLoggingOut || !workspaceName.trim()}
            className="px-4 py-2 subheading-md text-primary-onbrand bg-brand-solid hover:bg-brand-solid-hover disabled:bg-disabled disabled:text-disable disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              'Create Workspace'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateWorkspaceModal
