import { AppShell } from '../components/app-shell'
import { ChatView } from '../features/chat/views/chat-view'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const ChatPage = () => {
  const {
    onNewWorkspace,
    onIntegrationsClick,
    onHelpClick,
    onLogout,
    onWorkspaceSettings,
  } = useAppShellActions()

  return (
    <AppShell
      onNewWorkspace={onNewWorkspace}
      onIntegrationsClick={onIntegrationsClick}
      onHelpClick={onHelpClick}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      <div className="w-full h-full">
        <ChatView
          onIntegrationsClick={onIntegrationsClick}
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