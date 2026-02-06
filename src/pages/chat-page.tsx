import { lazy } from 'react'
import { useNavigation } from '@contexts/navigation-context'
import { AppLayout } from '@components/app-layout'

const ChatView = lazy(() => import('@features/chat/components/chat-view'))

export const ChatPage = () => {
  const {
    navigateIntegrations,
    navigateHelp,
    navigateWorkspaceSettings,
    handleLogout
  } = useNavigation()

  return (
    <AppLayout>
      <div className="w-full h-full">
        <ChatView
          onIntegrationsClick={navigateIntegrations}
          onHelpClick={navigateHelp}
          onLogout={handleLogout}
          onWorkspaceSettings={navigateWorkspaceSettings}
        />
      </div>
    </AppLayout>
  )
}

export default ChatPage
