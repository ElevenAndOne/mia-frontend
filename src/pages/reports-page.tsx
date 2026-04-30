import { AppShell } from '../components/app-shell'
import { AnimatedPageWrapper } from '../components/animated-page-wrapper'
import { ReportView } from '../features/reports/report-view'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const ReportsPage = () => {
  const {
    onNewWorkspace,
    onIntegrationsClick,
    onCampaignsClick,
    onStrategiseClick,
    onHelpClick,
    onLogout,
    onWorkspaceSettings,
  } = useAppShellActions()

  return (
    <AppShell
      onNewWorkspace={onNewWorkspace}
      onIntegrationsClick={onIntegrationsClick}
      onCampaignsClick={onCampaignsClick}
      onStrategiseClick={onStrategiseClick}
      onHelpClick={onHelpClick}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      <AnimatedPageWrapper preset="slideUp" className="w-full h-full">
        <ReportView />
      </AnimatedPageWrapper>
    </AppShell>
  )
}

export default ReportsPage
