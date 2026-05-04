import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { AnimatedPageWrapper } from '../components/animated-page-wrapper'
import { CampaignsView } from '../features/campaigns/campaigns-view'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const CampaignsPage = () => {
  const navigate = useNavigate()
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
      <AnimatedPageWrapper preset="slideUp" className="w-full h-full">
        <CampaignsView onBack={() => navigate('/home')} />
      </AnimatedPageWrapper>
    </AppShell>
  )
}

export default CampaignsPage
