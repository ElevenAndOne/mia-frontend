import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import IntegrationsView from '../features/integrations/integrations-page'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const IntegrationsPage = () => {
  const navigate = useNavigate()
  const {
    onNewChat,
    onIntegrationsClick,
    onHelpClick,
    onLogout,
    onWorkspaceSettings,
  } = useAppShellActions()

  return (
    <AppShell
      onNewChat={onNewChat}
      onIntegrationsClick={onIntegrationsClick}
      onHelpClick={onHelpClick}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      <div className="w-full h-full">
        <IntegrationsView onBack={() => navigate('/home')} />
      </div>
    </AppShell>
  )
}

export default IntegrationsPage
