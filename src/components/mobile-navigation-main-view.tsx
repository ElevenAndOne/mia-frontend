import { Icon } from './icon'
import type { SegmentedControlOption } from './segmented-control'
import { SegmentedControl } from './segmented-control'
import type { Workspace } from '../features/workspace/types'
import type { RecentConversation } from '../features/chat/services/chat-service'

interface MobileNavigationMainViewProps {
  onClose: () => void
  onNewWorkspace?: () => void
  onIntegrationsClick?: () => void
  onCampaignsClick?: () => void
  onHelpClick?: () => void
  onWorkspaceSettings?: () => void
  onLogout?: () => void
  activeWorkspace?: Workspace | null
  userName?: string
  userEmail?: string
  userImageUrl?: string | null
  theme: 'system' | 'light' | 'dark'
  themeOptions: Array<SegmentedControlOption<'system' | 'light' | 'dark'>>
  onThemeChange: (value: 'system' | 'light' | 'dark') => void
  recentConversations?: RecentConversation[]
  onRecentChatsClick?: () => void
}

export const MobileNavigationMainView = ({
  onClose,
  onNewWorkspace,
  onIntegrationsClick,
  onCampaignsClick,
  onHelpClick,
  onWorkspaceSettings,
  onLogout,
  activeWorkspace,
  theme,
  themeOptions,
  onThemeChange,
  recentConversations = [],
  onRecentChatsClick,
}: MobileNavigationMainViewProps) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-tertiary flex items-center justify-between">
        <h2 className="label-md text-primary">MIA</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
          aria-label="Close menu"
        >
          <Icon.x_close size={20} />
        </button>
      </div>

      {/* Primary Actions */}
      <div className="p-4 space-y-2">
        {onNewWorkspace && (
          <button
            onClick={() => {
              onClose()
              onNewWorkspace()
            }}
            className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.plus size={20} className="text-tertiary" />
            <span className="paragraph-sm">New Workspace</span>
          </button>
        )}

        <button
          onClick={onIntegrationsClick}
          className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
        >
          <Icon.globe_01 size={20} className="text-tertiary" />
          <span className="paragraph-sm">Integrations</span>
        </button>

        {onCampaignsClick && (
          <button
            onClick={() => {
              onClose()
              onCampaignsClick()
            }}
            className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.target_01 size={20} className="text-tertiary" />
            <span className="paragraph-sm">Campaigns</span>
          </button>
        )}

        {onWorkspaceSettings && (
          <button
            onClick={onWorkspaceSettings}
            className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.settings_01 size={20} className="text-tertiary" />
            <span className="paragraph-sm">Workspace Settings</span>
          </button>
        )}

        {onHelpClick && (
          <button
            onClick={onHelpClick}
            className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.help_circle size={20} className="text-tertiary" />
            <span className="paragraph-sm">Help</span>
          </button>
        )}
      </div>

      <div className="border-t border-tertiary mx-4" />

      {onRecentChatsClick && (
        <button
          onClick={onRecentChatsClick}
          className="w-full px-3 py-2.5 mx-4 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          style={{ width: 'calc(100% - 2rem)' }}
        >
          <Icon.message_chat_square size={20} className="text-tertiary" />
          <span className="paragraph-sm flex-1 text-left">Recent Chats</span>
          {recentConversations.length > 0 && (
            <span className="paragraph-xs text-quaternary">{recentConversations.length}</span>
          )}
          <Icon.chevron_right size={16} className="text-quaternary" />
        </button>
      )}

      <div className="border-t border-tertiary mx-4" />

      {/* Active Workspace */}
      {activeWorkspace && (
        <div className="p-4">
          <h3 className="label-xs text-quaternary mb-3 px-3">Active Workspace</h3>
          <div className="px-3 py-2.5 rounded-lg bg-success-primary border border-utility-success-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-utility-success-500 to-utility-success-600 flex items-center justify-center text-white label-sm shrink-0">
                {activeWorkspace.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="paragraph-sm text-primary font-medium truncate">
                  {activeWorkspace.name}
                </p>
                <p className="paragraph-xs text-quaternary">
                  {activeWorkspace.role} · {activeWorkspace.connected_platforms?.length || 0}{' '}
                  platforms
                </p>
              </div>
              <Icon.check size={18} className="text-success shrink-0" />
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-tertiary mx-4" />

      {/* Theme */}
      <div className="px-4 py-3">
        <SegmentedControl options={themeOptions} value={theme} onChange={onThemeChange} fullWidth />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sign Out - bottom with padding */}
      <div className="p-4 pt-2 border-t border-tertiary">
        <button
          onClick={onLogout}
          className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-error hover:bg-error-primary transition-colors"
        >
          <Icon.log_out_01 size={20} />
          <span className="paragraph-sm">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
