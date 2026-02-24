import { Icon } from '../../../components/icon'
import { TopBar } from '../../../components/top-bar'
import CreateWorkspaceModal from '../views/create-workspace-modal'
import { WorkspaceListItem } from './workspace-list-item'
import type { WorkspaceOverviewItem } from '../utils/workspace-settings'

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
  // Suppress unused var warning - button is commented out but prop kept for future use
  void _onOpenCreateModal
  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar
        title="Workspaces"
        onBack={onBack}
        className="border-b border-tertiary"
      />

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 max-w-3xl mx-auto w-full">
        <div className="space-y-3">
          {items.map((item) => (
            <WorkspaceListItem
              key={item.workspace.tenant_id}
              workspace={item.workspace}
              isActive={item.isActive}
              isSwitching={false}
              onSelect={onSelectWorkspace}
              variant="detailed"
              className="rounded-xl p-4 gap-3"
              disableWhenActive={false}
              activeClassName="bg-secondary border border-secondary hover:bg-tertiary"
              inactiveClassName="bg-secondary hover:bg-tertiary"
              showStatusIndicator={false}
              showRoleIcon={false}
              useGradientAvatar={false}
              avatarClassName="w-10 h-10 rounded-xl bg-brand-solid"
              avatarTextClassName="label-bg text-primary-onbrand"
              titleClassName="label-md"
              titleSuffix={
                item.isActive ? (
                  <span className="px-2 py-0.5 rounded-full label-xs bg-secondary text-white">Active</span>
                ) : null
              }
              details={
                <div className="flex items-center gap-2 paragraph-xs text-quaternary mt-0.5">
                  <span className={`px-1.5 py-0.5 rounded ${item.roleBadgeClass}`}>
                    {item.workspace.role}
                  </span>
                  <span>·</span>
                  <span>{item.memberLabel}</span>
                  {!item.canManage && (
                    <>
                      <span>·</span>
                      <span className="text-placeholder-subtle">View only</span>
                    </>
                  )}
                </div>
              }
              trailing={<Icon.chevron_right size={20} className="text-placeholder-subtle shrink-0" />}
            />
          ))}
        </div>

        {/* HIDDEN (Feb 2026): Create Workspace button removed - focusing on single workspace per user
            Workspace creation happens during onboarding flow only
        <button
          onClick={onOpenCreateModal}
          className="w-full mt-4 py-3 px-4 border-2 border-dashed border-primary rounded-xl subheading-md text-tertiary flex items-center justify-center gap-2 hover:border-secondary hover:text-secondary transition-colors"
        >
          <Icon.plus size={20} />
          Create New Workspace
        </button>
        */}
      </div>

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={onCloseCreateModal}
        onSuccess={onWorkspaceCreated}
      />
    </div>
  )
}
