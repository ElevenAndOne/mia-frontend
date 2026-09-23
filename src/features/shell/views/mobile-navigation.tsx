import { useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { Sheet } from '../../overlay'
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
  onLogout,
  onWorkspaceSettings,
  onLoadConversation,
}: MobileNavigationProps) => {
  const { user, activeWorkspace, sessionId } = useSession()
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
  const handleWorkspaceSettings = () => {
    onWorkspaceSettings?.()
    onClose()
  }
  const handleLogout = () => {
    onLogout?.()
    onClose()
  }

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
      className="w-[85vw] max-w-[20rem]"
    >
      {view === 'main' ? (
        <MobileNavigationMainView
          onClose={onClose}
          onNewWorkspace={onNewWorkspace}
          onIntegrationsClick={handleIntegrations}
          onCampaignsClick={onCampaignsClick ? handleCampaigns : undefined}
          onReportsClick={onReportsClick ? handleReports : undefined}
          onWorkspaceSettings={onWorkspaceSettings ? handleWorkspaceSettings : undefined}
          onLogout={handleLogout}
          activeWorkspace={activeWorkspace}
          userName={user?.name || 'User'}
          userEmail={user?.email || ''}
          userImageUrl={user?.picture_url}
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
