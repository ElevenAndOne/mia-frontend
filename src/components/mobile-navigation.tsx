import { useState } from 'react'
import { useSession } from '../contexts/session-context'
import { useTheme } from '../contexts/theme-context'
import { Sheet } from '../features/overlay'
import { Icon } from './icon'
import { SegmentedControl, type SegmentedControlOption } from './segmented-control'

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
  onNewChat?: () => void
  onIntegrationsClick?: () => void
  onHelpClick?: () => void
  onLogout?: () => void
  onWorkspaceSettings?: () => void
}

type NavigationView = 'main' | 'user'

export const MobileNavigation = ({
  isOpen,
  onClose,
  onNewChat,
  onIntegrationsClick,
  onHelpClick,
  onLogout,
  onWorkspaceSettings
}: MobileNavigationProps) => {
  const [currentView, setCurrentView] = useState<NavigationView>('main')
  const { user, activeWorkspace, availableWorkspaces, switchWorkspace } = useSession()
  const { theme, setTheme } = useTheme()

  const themeOptions: Array<SegmentedControlOption<typeof theme>> = [
    { value: 'system', label: 'Auto', icon: <Icon.monitor_01 size={16} /> },
    { value: 'light', label: 'Light', icon: <Icon.sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Icon.moon_01 size={16} /> },
  ]
  const [isSwitching, setIsSwitching] = useState(false)

  const handleNewChat = () => {
    onNewChat?.()
    onClose()
  }

  const handleIntegrations = () => {
    onIntegrationsClick?.()
    onClose()
  }

  const handleHelp = () => {
    onHelpClick?.()
    onClose()
  }

  const handleWorkspaceSettings = () => {
    onWorkspaceSettings?.()
    onClose()
    setCurrentView('main')
  }

  const handleLogout = () => {
    onLogout?.()
    onClose()
  }

  const handleWorkspaceSwitch = async (tenantId: string) => {
    if (tenantId === activeWorkspace?.tenant_id || isSwitching) return

    setIsSwitching(true)
    try {
      const success = await switchWorkspace(tenantId)
      if (success) {
        window.location.reload()
      }
    } catch (error) {
      console.error('[MOBILE-NAV] Workspace switch error:', error)
    } finally {
      setIsSwitching(false)
    }
  }

  const handleThemeChange = (value: typeof theme) => {
    setTheme(value)
  }

  const renderAvatar = (size: 'sm' | 'lg' = 'sm') => {
    const sizeClasses = size === 'lg' ? 'w-12 h-12 paragraph-bg' : 'w-9 h-9 paragraph-sm'

    if (user?.picture_url) {
      return (
        <img
          src={user.picture_url}
          alt={user.name || 'User'}
          className={`${sizeClasses} rounded-full object-cover`}
        />
      )
    }

    return (
      <div className={`${sizeClasses} rounded-full bg-utility-warning-400 flex items-center justify-center font-medium text-utility-warning-700`}>
        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    )
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <svg className="w-3 h-3 text-warning" fill="currentColor" viewBox="0 0 20 20" aria-label="Owner">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      case 'admin':
        return (
          <svg className="w-3 h-3 text-utility-info-500" fill="currentColor" viewBox="0 0 20 20" aria-label="Admin">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'analyst':
        return (
          <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20" aria-label="Analyst">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
        )
      case 'viewer':
        return (
          <svg className="w-3 h-3 text-placeholder-subtle" fill="currentColor" viewBox="0 0 20 20" aria-label="Viewer">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-3 h-3 text-placeholder-subtle" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  // Main navigation view
  const renderMainView = () => (
    <div className="flex flex-col h-full">
      {/* Header - Product name with close button */}
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

      {/* Primary Navigation */}
      <div className="p-4 space-y-2">
        <button
          onClick={handleNewChat}
          className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
        >
          <Icon.pencil_line size={20} className="text-tertiary" />
          <span className="paragraph-sm">New Chat</span>
        </button>

        <button
          onClick={handleIntegrations}
          className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
        >
          <Icon.globe_01 size={20} className="text-tertiary" />
          <span className="paragraph-sm">Integrations</span>
        </button>

        {onHelpClick && (
          <button
            onClick={handleHelp}
            className="w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.help_circle size={20} className="text-tertiary" />
            <span className="paragraph-sm">Help</span>
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-tertiary mx-4" />

      {/* Workspace Section */}
      <div className="p-4">
        <h3 className="label-xs text-quaternary mb-3 px-3">Workspace</h3>
        <div className="space-y-1">
          {availableWorkspaces.length === 0 ? (
            <div className="px-3 py-2 text-quaternary paragraph-sm">
              No workspaces yet
            </div>
          ) : (
            availableWorkspaces.map((workspace) => (
              <button
                key={workspace.tenant_id}
                onClick={() => handleWorkspaceSwitch(workspace.tenant_id)}
                disabled={isSwitching}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                  workspace.tenant_id === activeWorkspace?.tenant_id
                    ? 'bg-utility-info-100 border border-utility-info-300'
                    : 'hover:bg-secondary'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-utility-info-500 to-utility-purple-600 flex items-center justify-center text-white label-sm shrink-0">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="subheading-md text-primary truncate">{workspace.name}</span>
                    {getRoleIcon(workspace.role)}
                  </div>
                </div>
                {workspace.tenant_id === activeWorkspace?.tenant_id && (
                  <Icon.check size={18} className="text-utility-info-500 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Spacer to push user section to bottom */}
      <div className="flex-1" />

      {/* User Profile Entry */}
      <div className="p-4 border-t border-tertiary">
        <button
          onClick={() => setCurrentView('user')}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {renderAvatar('sm')}
          <div className="flex-1 min-w-0 text-left">
            <p className="paragraph-sm text-primary truncate">
              {user?.name || 'User'}
            </p>
            <p className="paragraph-xs text-quaternary truncate">
              {user?.email || ''}
            </p>
          </div>
          <Icon.chevron_right size={18} className="text-tertiary shrink-0" />
        </button>
      </div>
    </div>
  )

  // User detail view
  const renderUserView = () => (
    <div className="flex flex-col h-full">
      {/* Header with back button and close button */}
      <div className="px-4 py-4 border-b border-tertiary flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('main')}
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

      {/* User Info */}
      <div className="p-4 border-b border-tertiary">
        <div className="flex items-center gap-4">
          {renderAvatar('lg')}
          <div className="flex-1 min-w-0">
            <p className="label-md text-primary truncate">
              {user?.name || 'User'}
            </p>
            <p className="paragraph-sm text-tertiary truncate">
              {user?.email || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-2">
        {onWorkspaceSettings && (
          <button
            onClick={handleWorkspaceSettings}
            className="w-full px-4 py-3 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.settings_01 size={18} className="text-tertiary" />
            <span>Workspace Settings</span>
          </button>
        )}

        {onIntegrationsClick && (
          <button
            onClick={handleIntegrations}
            className="w-full px-4 py-3 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.globe_01 size={18} className="text-tertiary" />
            <span>Integrations</span>
          </button>
        )}

        {onHelpClick && (
          <button
            onClick={handleHelp}
            className="w-full px-4 py-3 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
          >
            <Icon.help_circle size={18} className="text-tertiary" />
            <span>Help</span>
          </button>
        )}

        <div className="px-4 py-3">
          <SegmentedControl
            options={themeOptions}
            value={theme}
            onChange={handleThemeChange}
            fullWidth
          />
        </div>

        <div className="border-t border-tertiary my-1" />

        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 text-left paragraph-sm flex items-center gap-3 text-error hover:bg-error-primary transition-colors"
        >
          <Icon.log_out_01 size={18} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Version footer */}
      <div className="mt-auto px-4 py-3 border-t border-tertiary">
        <p className="paragraph-xs text-quaternary">
          v1.0.0
        </p>
      </div>
    </div>
  )

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      showHandle={false}
      className="w-[85vw] max-w-[320px]"
    >
      {currentView === 'main' ? renderMainView() : renderUserView()}
    </Sheet>
  )
}
