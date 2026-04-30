import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { AnimatedPageWrapper } from '../components/animated-page-wrapper'
import { ReportView } from '../features/reports/report-view'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const ReportsPage = () => {
  const navigate = useNavigate()
  const {
    onNewWorkspace,
    onIntegrationsClick,
    onCampaignsClick,
    onHelpClick,
    onLogout,
    onWorkspaceSettings,
  } = useAppShellActions()

  return (
    <AppShell
      onNewWorkspace={onNewWorkspace}
      onIntegrationsClick={onIntegrationsClick}
      onCampaignsClick={onCampaignsClick}
      onHelpClick={onHelpClick}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      <AnimatedPageWrapper preset="slideUp" className="w-full h-full">
        <ReportView onBack={() => navigate('/home')} />
      </AnimatedPageWrapper>
    </AppShell>
  )
}

export default ReportsPage
