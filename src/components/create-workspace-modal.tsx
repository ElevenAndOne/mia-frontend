import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../contexts/session-context'

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  defaultName?: string
  onSuccess?: (tenantId: string) => void
  required?: boolean  // If true, user cannot dismiss the modal without creating
}

const CreateWorkspaceModal = ({ isOpen, onClose, defaultName = '', onSuccess, required = false }: CreateWorkspaceModalProps) => {
  const { createWorkspace } = useSession()

  const [workspaceName, setWorkspaceName] = useState(defaultName)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={required ? undefined : onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {required ? 'Create Your First Workspace' : 'Create Workspace'}
                </h2>
                {!required && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-gray-600 text-sm mb-4">
                {required
                  ? 'Name your workspace to get started. You can invite team members later.'
                  : 'Create a workspace to organize your marketing data and collaborate with your team.'}
              </p>

              {/* Workspace Name Input */}
              <div className="mb-4">
                <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    error ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  autoFocus
                  disabled={isCreating}
                />
                {error && (
                  <p className="mt-1.5 text-sm text-red-500">{error}</p>
                )}
              </div>

              {/* Features Preview */}
              <div className="bg-gray-50 rounded-xl p-4 mb-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">What you get:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Shared platform connections
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Team collaboration
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Role-based access control
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              {!required && (
                <button
                  onClick={onClose}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleCreate}
                disabled={isCreating || !workspaceName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CreateWorkspaceModal
