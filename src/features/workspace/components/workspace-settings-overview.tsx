import { Icon } from '../../../components/icon'
import { TopBar } from '../../../components/top-bar'
import CreateWorkspaceModal from '../views/create-workspace-modal'
import type { WorkspaceOverviewItem } from '../utils/workspace-settings'
import { useSession } from '../../../contexts/session-context'
import { useWorkspaceSwitcher } from '../hooks/use-workspace-switcher'

interface WorkspaceSettingsOverviewProps {
  items: WorkspaceOverviewItem[]
  onSelectWorkspace: (workspaceId: string) => void
  onBack: () => void
  showCreateModal: boolean
  onOpenCreateModal: () => void
  onCloseCreateModal: () => void
  onWorkspaceCreated: () => void
}

export const WorkspaceSettingsOverview = ({
  items,
  onSelectWorkspace,
  onBack,
  showCreateModal,
  onOpenCreateModal: _onOpenCreateModal,
  onCloseCreateModal,
  onWorkspaceCreated,
}: WorkspaceSettingsOverviewProps) => {
  void _onOpenCreateModal

  const { activeWorkspace, switchWorkspace, refreshWorkspaces, refreshAccounts } = useSession()
  const { isSwitching, switchingId, handleSwitch } = useWorkspaceSwitcher({
    activeWorkspaceId: activeWorkspace?.tenant_id,
    switchWorkspace,
    refreshAfterSwitch: async () => {
      await refreshAccounts()
      await refreshWorkspaces()
    },
    reloadOnSuccess: false,
  })

  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar
        title="Workspaces"
        onBack={onBack}
        className="border-b border-tertiary"
      />

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 max-w-3xl mx-auto w-full">
        <div className="space-y-3">
          {items.map((item) => {
            const isActive = item.isActive
            const isThisSwitching = switchingId === item.workspace.tenant_id

            return (
              <div
                key={item.workspace.tenant_id}
                className={`rounded-xl p-4 flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'bg-utility-brand-50 border-2 border-utility-brand-400'
                    : 'bg-secondary hover:bg-tertiary border border-transparent'
                }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-utility-brand-500' : 'bg-brand-solid'
                }`}>
                  <span className="label-bg text-primary-onbrand">
                    {item.workspace.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info — tapping goes to workspace detail/settings */}
                <button
                  onClick={() => onSelectWorkspace(item.workspace.tenant_id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="label-md text-primary truncate">{item.workspace.name}</span>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full label-xs bg-utility-brand-500 text-white shrink-0">Active</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 paragraph-xs text-quaternary mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded ${item.roleBadgeClass}`}>
                      {item.workspace.role}
                    </span>
                    <span>·</span>
                    <span>{item.memberLabel}</span>
                  </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => handleSwitch(item.workspace.tenant_id)}
                      disabled={isSwitching}
                      className="px-3 py-1.5 rounded-lg label-xs bg-utility-brand-500 text-white hover:bg-utility-brand-600 disabled:opacity-50 transition-colors"
                    >
                      {isThisSwitching ? 'Switching...' : 'Set Active'}
                    </button>
                  )}
                  <button
                    onClick={() => onSelectWorkspace(item.workspace.tenant_id)}
                    className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
                    aria-label="Workspace settings"
                  >
                    <Icon.chevron_right size={20} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={onCloseCreateModal}
        onSuccess={onWorkspaceCreated}
      />
    </div>
  )
}
