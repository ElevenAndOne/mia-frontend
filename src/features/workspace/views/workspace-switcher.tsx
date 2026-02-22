import { useSession } from '../../../contexts/session-context'
import { BackButton } from '../../../components/back-button'
import { useWorkspaceSwitcher } from '../hooks/use-workspace-switcher'
import { WorkspaceListItem } from '../components/workspace-list-item'

interface WorkspaceSwitcherProps {
  onClose: () => void
  onCreateWorkspace: () => void
  onSettings?: () => void
}

const WorkspaceSwitcher = ({ onClose, onCreateWorkspace, onSettings }: WorkspaceSwitcherProps) => {
  const {
    activeWorkspace,
    availableWorkspaces,
    switchWorkspace,
    refreshWorkspaces,
    refreshAccounts
  } = useSession()

  const { isSwitching, switchingId, handleSwitch } = useWorkspaceSwitcher({
    activeWorkspaceId: activeWorkspace?.tenant_id,
    switchWorkspace,
    onSuccess: onClose,
    refreshAfterSwitch: async () => {
      await refreshAccounts()
      await refreshWorkspaces()
    },
    reloadOnSuccess: false,
  })

  return (
    <div className="absolute top-8 left-0 bg-primary rounded-lg shadow-lg border border-secondary min-w-72 z-30">
      {/* Header with Back button */}
      <div className="px-4 py-3 border-b border-tertiary">
        <div className="flex items-center justify-between">
          <BackButton onClick={onClose} label="Back" size="sm" />
          <span className="paragraph-xs text-quaternary">{availableWorkspaces.length} workspace{availableWorkspaces.length !== 1 ? 's' : ''}</span>
        </div>
        <h3 className="label-md text-primary mt-2">Workspaces</h3>
      </div>

      {/* Workspace List */}
      <div className="flex flex-col gap-1 px-2 py-2 max-h-64 overflow-y-auto">
        {availableWorkspaces.length === 0 ? (
          <div className="px-3 py-4 text-center text-quaternary paragraph-sm">
            No workspaces yet
          </div>
        ) : (
          availableWorkspaces.map((workspace) => (
            <WorkspaceListItem
              key={workspace.tenant_id}
              workspace={workspace}
              isActive={workspace.tenant_id === activeWorkspace?.tenant_id}
              isSwitching={switchingId === workspace.tenant_id}
              onSelect={handleSwitch}
              disabled={isSwitching}
            />
          ))
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-tertiary"></div>

      {/* Workspace Settings Button - only show if there's an active workspace and user is admin/owner */}
      {activeWorkspace && (activeWorkspace.role === 'owner' || activeWorkspace.role === 'admin') && onSettings && (
        <button
          onClick={onSettings}
          data-track-id="workspace-switcher-settings"
          className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-tertiary flex items-center justify-center">
            <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="subheading-md text-secondary">Workspace Settings</span>
        </button>
      )}

      {/* Create New Workspace Button */}
      <button
        onClick={onCreateWorkspace}
        data-track-id="workspace-switcher-create-workspace"
        className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-lg border-2 border-dashed border-primary flex items-center justify-center">
          <svg className="w-4 h-4 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span className="subheading-md text-secondary">Create New Workspace</span>
      </button>
    </div>
  )
}

export default WorkspaceSwitcher
