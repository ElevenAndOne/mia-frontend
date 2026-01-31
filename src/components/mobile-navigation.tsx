import { useState } from 'react'
import { useSession } from '../contexts/session-context'
import { useTheme } from '../contexts/theme-context'
import { Sheet } from '../features/overlay'
import { Icon } from './icon'
import type { SegmentedControlOption } from './segmented-control'
import { useWorkspaceSwitcher } from '../features/workspace/hooks/use-workspace-switcher'
import { MobileNavigationMainView } from './mobile-navigation-main-view'
import { MobileNavigationUserView } from './mobile-navigation-user-view'

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
  const { isSwitching, switchingId, handleSwitch } = useWorkspaceSwitcher({
    activeWorkspaceId: activeWorkspace?.tenant_id,
    switchWorkspace,
    onSuccess: onClose,
  })

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

  const handleThemeChange = (value: typeof theme) => {
    setTheme(value)
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      showHandle={false}
      className="w-[85vw] max-w-[320px]"
    >
      {currentView === 'main' ? (
        <MobileNavigationMainView
          onClose={onClose}
          onNewChat={handleNewChat}
          onIntegrationsClick={handleIntegrations}
          onHelpClick={onHelpClick ? handleHelp : undefined}
          onOpenUser={() => setCurrentView('user')}
          availableWorkspaces={availableWorkspaces}
          activeWorkspaceId={activeWorkspace?.tenant_id}
          isSwitching={isSwitching}
          switchingId={switchingId}
          onSelectWorkspace={handleSwitch}
          userName={user?.name || 'User'}
          userEmail={user?.email || ''}
          userImageUrl={user?.picture_url}
        />
      ) : (
        <MobileNavigationUserView
          userName={user?.name || 'User'}
          userEmail={user?.email || ''}
          userImageUrl={user?.picture_url}
          theme={theme}
          themeOptions={themeOptions}
          onThemeChange={handleThemeChange}
          onBack={() => setCurrentView('main')}
          onClose={onClose}
          onIntegrationsClick={onIntegrationsClick ? handleIntegrations : undefined}
          onHelpClick={onHelpClick ? handleHelp : undefined}
          onWorkspaceSettings={onWorkspaceSettings ? handleWorkspaceSettings : undefined}
          onLogout={handleLogout}
        />
      )}
    </Sheet>
  )
}
