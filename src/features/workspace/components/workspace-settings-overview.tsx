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
      <TopBar title="Workspaces" onBack={onBack} className="border-b border-tertiary" />

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 max-w-3xl mx-auto w-full">
        <div className="space-y-3">
          {items.map((item) => {
            const isActive = item.isActive
            const isThisSwitching = switchingId === item.workspace.tenant_id

            return (
              <div
                key={item.workspace.tenant_id}
                className={`rounded-xl p-4 transition-colors ${
                  isActive
                    ? 'bg-secondary border-2 border-utility-success-400 hover:bg-tertiary'
                    : 'bg-secondary border border-transparent hover:bg-tertiary'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-solid">
                    <span className="label-bg text-primary-onbrand">
                      {item.workspace.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <span className="label-md text-primary truncate block">
                      {item.workspace.name}
                    </span>
                    <div className="flex items-center gap-1.5 paragraph-xs text-quaternary mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded ${item.roleBadgeClass}`}>
                        {item.workspace.role}
                      </span>
                      <span>·</span>
                      <span>{item.memberLabel}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isActive ? (
                      <span className="px-2 py-0.5 rounded-full label-xs bg-utility-success-500 text-white">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSwitch(item.workspace.tenant_id)
                        }}
                        disabled={isSwitching}
                        className="px-2 py-0.5 rounded-full label-xs bg-utility-info-500 text-white hover:bg-utility-info-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {isThisSwitching ? '...' : 'Set Active'}
                      </button>
                    )}
                    <button
                      onClick={() => onSelectWorkspace(item.workspace.tenant_id)}
                      className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
                      aria-label="Workspace settings"
                    >
                      <Icon.settings_01 size={16} />
                    </button>
                  </div>
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
