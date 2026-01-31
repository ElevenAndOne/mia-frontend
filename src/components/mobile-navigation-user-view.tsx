import type { SegmentedControlOption } from './segmented-control'
import { SegmentedControl } from './segmented-control'
import { Icon } from './icon'
import { UserAvatar } from './user-avatar'

interface MobileNavigationUserViewProps {
  userName?: string
  userEmail?: string
  userImageUrl?: string | null
  theme: 'system' | 'light' | 'dark'
  themeOptions: Array<SegmentedControlOption<'system' | 'light' | 'dark'>>
  onThemeChange: (value: 'system' | 'light' | 'dark') => void
  onBack: () => void
  onClose: () => void
  onIntegrationsClick?: () => void
  onHelpClick?: () => void
  onWorkspaceSettings?: () => void
  onLogout?: () => void
}

export const MobileNavigationUserView = ({
  userName,
  userEmail,
  userImageUrl,
  theme,
  themeOptions,
  onThemeChange,
  onBack,
  onClose,
  onIntegrationsClick,
  onHelpClick,
  onWorkspaceSettings,
  onLogout,
}: MobileNavigationUserViewProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-tertiary flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
            aria-label="Back to menu"
          >
            <Icon.chevron_left size={20} />
          </button>
          <h2 className="label-md text-primary">Account</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
          aria-label="Close menu"
        >
          <Icon.x_close size={20} />
        </button>
      </div>

      <div className="p-4 border-b border-tertiary">
        <div className="flex items-center gap-4">
          <UserAvatar name={userName || 'User'} imageUrl={userImageUrl} size="lg" />
          <div>
            <p className="label-md text-primary">{userName || 'User'}</p>
            <p className="paragraph-sm text-quaternary">{userEmail || ''}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {onWorkspaceSettings && (
          <button
            onClick={onWorkspaceSettings}
            className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.settings_01 size={20} className="text-tertiary" />
            <span className="paragraph-sm">Workspace Settings</span>
          </button>
        )}

        {onIntegrationsClick && (
          <button
            onClick={onIntegrationsClick}
            className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.globe_01 size={20} className="text-tertiary" />
            <span className="paragraph-sm">Integrations</span>
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

      <div className="px-4">
        <SegmentedControl options={themeOptions} value={theme} onChange={onThemeChange} fullWidth />
      </div>

      <div className="flex-1" />

      <div className="p-4 border-t border-tertiary">
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
