import { Icon } from './icon'
import { UserAvatar } from './user-avatar'
import { WorkspaceListItem } from '../features/workspace/components/workspace-list-item'
import type { Workspace } from '../features/workspace/types'

interface MobileNavigationMainViewProps {
  onClose: () => void
  onNewChat?: () => void
  onIntegrationsClick?: () => void
  onHelpClick?: () => void
  onOpenUser: () => void
  availableWorkspaces: Workspace[]
  activeWorkspaceId?: string
  isSwitching: boolean
  switchingId: string | null
  onSelectWorkspace: (tenantId: string) => void
  userName?: string
  userEmail?: string
  userImageUrl?: string | null
}

export const MobileNavigationMainView = ({
  onClose,
  onNewChat,
  onIntegrationsClick,
  onHelpClick,
  onOpenUser,
  availableWorkspaces,
  activeWorkspaceId,
  isSwitching,
  switchingId,
  onSelectWorkspace,
  userName,
  userEmail,
  userImageUrl,
}: MobileNavigationMainViewProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-tertiary flex items-center justify-between">
        <h2 className="label-md text-primary">MIA</h2>
        <button
          onClick={onClose}
          data-track-id="mobile-nav-close"
          className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
          aria-label="Close menu"
        >
          <Icon.x_close size={20} />
        </button>
      </div>

      <div className="p-4 space-y-2">
        <button
          onClick={onNewChat}
          data-track-id="mobile-nav-new-chat"
          className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
        >
          <Icon.pencil_line size={20} className="text-tertiary" />
          <span className="paragraph-sm">New Chat</span>
        </button>

        <button
          onClick={onIntegrationsClick}
          data-track-id="mobile-nav-integrations"
          className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
        >
          <Icon.globe_01 size={20} className="text-tertiary" />
          <span className="paragraph-sm">Integrations</span>
        </button>

        {onHelpClick && (
          <button
            onClick={onHelpClick}
            data-track-id="mobile-nav-help"
            className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.help_circle size={20} className="text-tertiary" />
            <span className="paragraph-sm">Help</span>
          </button>
        )}
      </div>

      <div className="border-t border-tertiary mx-4" />

      <div className="p-4">
        <h3 className="label-xs text-quaternary mb-3 px-3">Workspace</h3>
        <div className="space-y-1">
          {availableWorkspaces.length === 0 ? (
            <div className="px-3 py-2 text-quaternary paragraph-sm">No workspaces yet</div>
          ) : (
            availableWorkspaces.map((workspace) => (
              <WorkspaceListItem
                key={workspace.tenant_id}
                workspace={workspace}
                isActive={workspace.tenant_id === activeWorkspaceId}
                isSwitching={switchingId === workspace.tenant_id}
                onSelect={onSelectWorkspace}
                variant="compact"
                disabled={isSwitching}
                activeClassName="bg-utility-info-100 border border-utility-info-300"
                inactiveClassName="hover:bg-secondary"
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div className="p-4 border-t border-tertiary">
        <button
          onClick={onOpenUser}
          data-track-id="mobile-nav-open-user-menu"
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <UserAvatar name={userName || 'User'} imageUrl={userImageUrl} size="md" />
          <div className="flex-1 min-w-0 text-left">
            <p className="paragraph-sm text-primary truncate">{userName || 'User'}</p>
            <p className="paragraph-xs text-quaternary truncate">{userEmail || ''}</p>
          </div>
          <Icon.chevron_right size={18} className="text-tertiary shrink-0" />
        </button>
      </div>
    </div>
  )
}
