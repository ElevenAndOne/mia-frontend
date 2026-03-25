import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { AnimatedPageWrapper } from '../components/animated-page-wrapper'
import IntegrationsView from '../features/integrations/integrations-page'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const IntegrationsPage = () => {
  const navigate = useNavigate()
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
      <AnimatedPageWrapper preset="slideUp" className="w-full h-full">
        <IntegrationsView onBack={() => navigate(-1)} />
      </AnimatedPageWrapper>
    </AppShell>
  )
}

export default IntegrationsPage
