import { AppShell } from '../components/app-shell'
import { ChatView } from '../features/chat/views/chat-view'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const ChatPage = () => {
  const {
    onNewWorkspace,
    onIntegrationsClick,
    onCampaignsClick,
    onPredictClick,
    onReportsClick,
    onHelpClick,
    onLogout,
    onWorkspaceSettings,
  } = useAppShellActions()

  return (
    <AppShell
      onNewWorkspace={onNewWorkspace}
      onIntegrationsClick={onIntegrationsClick}
      onCampaignsClick={onCampaignsClick}
      onPredictClick={onPredictClick}
      onReportsClick={onReportsClick}
      onHelpClick={onHelpClick}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      <div className="w-full h-full">
        <ChatView
          onIntegrationsClick={onIntegrationsClick}
          onCampaignsClick={onCampaignsClick}
          onReportsClick={onReportsClick}
          onHelpClick={onHelpClick}
          onLogout={onLogout}
          onWorkspaceSettings={onWorkspaceSettings}
          onNewWorkspace={onNewWorkspace}
        />
      </div>
    </AppShell>
  )
}

export default ChatPage
