import { useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { useTheme } from '../../../contexts/theme-context'
import { Sheet } from '../../overlay'
import { Icon } from '../../../components/icon'
import type { SegmentedControlOption } from '../../../components/segmented-control'
import { MobileNavigationMainView } from '../../../components/mobile-navigation-main-view'
import { fetchRecentConversations } from '../../chat/services/chat-service'
import type { RecentConversation } from '../../chat/services/chat-service'

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
  onNewWorkspace?: () => void
  onIntegrationsClick?: () => void
  onCampaignsClick?: () => void
  onHelpClick?: () => void
  onLogout?: () => void
  onWorkspaceSettings?: () => void
  onLoadConversation?: (conversationId: string) => void
}

export const MobileNavigation = ({
  isOpen,
  onClose,
  onNewWorkspace,
  onIntegrationsClick,
  onCampaignsClick,
  onHelpClick,
  onLogout,
  onWorkspaceSettings,
  onLoadConversation,
}: MobileNavigationProps) => {
  const { user, activeWorkspace, sessionId } = useSession()
  const { theme, setTheme } = useTheme()
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])

  // Fetch recent conversations when menu opens
  useEffect(() => {
    if (isOpen && sessionId) {
      fetchRecentConversations(sessionId).then(setRecentConversations)
    }
  }, [isOpen, sessionId])

  const themeOptions: Array<SegmentedControlOption<typeof theme>> = [
    { value: 'system', label: 'Auto', icon: <Icon.monitor_01 size={16} /> },
    { value: 'light', label: 'Light', icon: <Icon.sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Icon.moon_01 size={16} /> },
  ]

  const handleIntegrations = () => {
    onIntegrationsClick?.()
    onClose()
  }

  const handleCampaigns = () => {
    onCampaignsClick?.()
    onClose()
  }

  const handleHelp = () => {
    onHelpClick?.()
    onClose()
  }

  const handleWorkspaceSettings = () => {
    onWorkspaceSettings?.()
    onClose()
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
      <MobileNavigationMainView
        onClose={onClose}
        onNewWorkspace={onNewWorkspace}
        onIntegrationsClick={handleIntegrations}
        onCampaignsClick={onCampaignsClick ? handleCampaigns : undefined}
        onHelpClick={onHelpClick ? handleHelp : undefined}
        onWorkspaceSettings={onWorkspaceSettings ? handleWorkspaceSettings : undefined}
        onLogout={handleLogout}
        activeWorkspace={activeWorkspace}
        userName={user?.name || 'User'}
        userEmail={user?.email || ''}
        userImageUrl={user?.picture_url}
        theme={theme}
        themeOptions={themeOptions}
        onThemeChange={handleThemeChange}
        recentConversations={recentConversations}
        onLoadConversation={onLoadConversation}
      />
    </Sheet>
  )
}
