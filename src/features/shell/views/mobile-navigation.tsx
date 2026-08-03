import { useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { useTheme } from '../../../contexts/theme-context'
import { useToast } from '../../../contexts/toast-context'
import { Sheet } from '../../overlay'
import { Monitor01 } from '../../../components/icon/monitor-01'
import { Moon01 } from '../../../components/icon/moon-01'
import { Sun } from '../../../components/icon/sun'
import type { SegmentedControlOption } from '../../../components/segmented-control'
import { MobileNavigationMainView } from '../../../components/mobile-navigation-main-view'
import { MobileNavigationChatsView } from '../../../components/mobile-navigation-chats-view'
import { fetchRecentConversations } from '../../chat/services/chat-service'
import type { RecentConversation } from '../../chat/services/chat-service'

type NavView = 'main' | 'chats'

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
  onNewWorkspace?: () => void
  onIntegrationsClick?: () => void
  onCampaignsClick?: () => void
  onReportsClick?: () => void
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
  onReportsClick,
  onHelpClick,
  onLogout,
  onWorkspaceSettings,
  onLoadConversation,
}: MobileNavigationProps) => {
  const { user, activeWorkspace, sessionId } = useSession()
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()
  const [view, setView] = useState<NavView>('main')
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])

  // Fetch recent conversations when menu opens; reset to main view
  useEffect(() => {
    if (!isOpen || !sessionId) return
    setView('main')
    let cancelled = false
    // Exclude campaign-builder conversations (skill: strategy_planning) — those
    // live under "Past builds" on the Campaigns page, not general chat history.
    const fetched = fetchRecentConversations(sessionId, undefined, 'strategy_planning')
    // Hold the list re-render until the slide-in settles — populating it
    // mid-animation is what made the sheet stutter on Android.
    const settle = new Promise((r) => setTimeout(r, 320))
    Promise.all([fetched, settle])
      .then(([convs]) => {
        if (!cancelled) setRecentConversations(convs)
      })
      .catch(() => {
        if (!cancelled) showToast('error', "Couldn't load your recent chats. Please try again.")
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, sessionId, showToast])

  const themeOptions: Array<SegmentedControlOption<typeof theme>> = [
    { value: 'system', label: 'Auto', icon: <Monitor01 size={16} /> },
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon01 size={16} /> },
  ]

  const handleIntegrations = () => {
    onIntegrationsClick?.()
    onClose()
  }
  const handleCampaigns = () => {
    onCampaignsClick?.()
    onClose()
  }
  const handleReports = () => {
    onReportsClick?.()
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
  const handleThemeChange = (value: typeof theme) => setTheme(value)

  const handleLoadConversation = (id: string) => {
    onLoadConversation?.(id)
    onClose()
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      showHandle={false}
      className="w-[85vw] max-w-[320px]"
    >
      {view === 'main' ? (
        <MobileNavigationMainView
          onClose={onClose}
          onNewWorkspace={onNewWorkspace}
          onIntegrationsClick={handleIntegrations}
          onCampaignsClick={onCampaignsClick ? handleCampaigns : undefined}
          onReportsClick={onReportsClick ? handleReports : undefined}
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
          onRecentChatsClick={onLoadConversation ? () => setView('chats') : undefined}
        />
      ) : (
        <MobileNavigationChatsView
          onBack={() => setView('main')}
          onClose={onClose}
          recentConversations={recentConversations}
          onLoadConversation={handleLoadConversation}
          onConversationsChange={setRecentConversations}
        />
      )}
    </Sheet>
  )
}
