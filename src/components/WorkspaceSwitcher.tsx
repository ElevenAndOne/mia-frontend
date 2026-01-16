import { useState } from 'react'
import { useSession, Workspace } from '../contexts/SessionContext'

interface WorkspaceSwitcherProps {
  onClose: () => void
  onCreateWorkspace: () => void
  onSettings?: () => void
}

const WorkspaceSwitcher = ({ onClose, onCreateWorkspace, onSettings }: WorkspaceSwitcherProps) => {
  const {
    activeWorkspace,
    availableWorkspaces,
    switchWorkspace
  } = useSession()

  const [isSwitching, setIsSwitching] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const handleWorkspaceSwitch = async (tenantId: string) => {
    if (tenantId === activeWorkspace?.tenant_id) return

    setIsSwitching(true)
    setSwitchingId(tenantId)

    try {
      const success = await switchWorkspace(tenantId)
      if (success) {
        onClose()
        // Refresh the page to load new workspace data
        window.location.reload()
      }
    } catch (error) {
      console.error('[WORKSPACE-SWITCHER] Switch error:', error)
    } finally {
      setIsSwitching(false)
      setSwitchingId(null)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" title="Owner">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      case 'admin':
        return (
          <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20" title="Admin">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'analyst':
        return (
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20" title="Analyst">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
        )
      case 'viewer':
        return (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" title="Viewer">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  return (
    <div className="absolute top-8 left-0 bg-white rounded-lg shadow-lg border border-gray-200 min-w-72 z-30">
      {/* Header with Back button */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back</span>
          </button>
          <span className="text-xs text-gray-500">{availableWorkspaces.length} workspace{availableWorkspaces.length !== 1 ? 's' : ''}</span>
        </div>
        <h3 className="font-semibold text-gray-900 mt-2">Workspaces</h3>
      </div>

      {/* Workspace List */}
      <div className="px-2 py-2 max-h-64 overflow-y-auto">
        {availableWorkspaces.length === 0 ? (
          <div className="px-3 py-4 text-center text-gray-500 text-sm">
            No workspaces yet
          </div>
        ) : (
          availableWorkspaces.map((workspace: Workspace) => (
            <button
              key={workspace.tenant_id}
              onClick={() => handleWorkspaceSwitch(workspace.tenant_id)}
              disabled={isSwitching || workspace.tenant_id === activeWorkspace?.tenant_id}
              className={`w-full px-3 py-2 text-left rounded-lg flex items-center gap-3 text-sm transition-colors ${
                workspace.tenant_id === activeWorkspace?.tenant_id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50'
              }`}
            >
              {/* Workspace Icon */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {workspace.name.charAt(0).toUpperCase()}
              </div>

              {/* Workspace Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900 truncate">{workspace.name}</span>
                  {getRoleIcon(workspace.role)}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{workspace.member_count} member{workspace.member_count !== 1 ? 's' : ''}</span>
                  {workspace.connected_platforms.length > 0 && (
                    <>
                      <span>-</span>
                      <span>{workspace.connected_platforms.length} platform{workspace.connected_platforms.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Active Indicator or Loading */}
              {workspace.tenant_id === activeWorkspace?.tenant_id ? (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : switchingId === workspace.tenant_id ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              ) : null}
            </button>
          ))
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100"></div>

      {/* Workspace Settings Button - only show if there's an active workspace and user is admin/owner */}
      {activeWorkspace && (activeWorkspace.role === 'owner' || activeWorkspace.role === 'admin') && onSettings && (
        <button
          onClick={onSettings}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="font-medium text-gray-700">Workspace Settings</span>
        </button>
      )}

      {/* Create New Workspace Button */}
      <button
        onClick={onCreateWorkspace}
        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span className="font-medium text-gray-700">Create New Workspace</span>
      </button>
    </div>
  )
}

export default WorkspaceSwitcher
