import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { AnimatedPageWrapper } from '../components/animated-page-wrapper'
import { CreativeStudioView } from '../features/creative-studio/creative-studio-view'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const CreativeStudioPage = () => {
  const navigate = useNavigate()
  const {
    onNewWorkspace,
    onIntegrationsClick,
    onCampaignsClick,
    onReportsClick,
    onCreativeStudioClick,
    onHelpClick,
    onLogout,
    onWorkspaceSettings,
  } = useAppShellActions()

  return (
    <AppShell
      onNewWorkspace={onNewWorkspace}
      onIntegrationsClick={onIntegrationsClick}
      onCampaignsClick={onCampaignsClick}
      onReportsClick={onReportsClick}
      onCreativeStudioClick={onCreativeStudioClick}
      onHelpClick={onHelpClick}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      <AnimatedPageWrapper preset="slideUp" className="w-full h-full overflow-y-auto">
        <CreativeStudioView onBack={() => navigate('/home')} />
      </AnimatedPageWrapper>
    </AppShell>
  )
}

export default CreativeStudioPage