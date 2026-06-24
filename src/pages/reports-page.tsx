import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { ReportView } from '../features/reports/report-view'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const ReportsPage = () => {
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
      <div className="w-full h-full">
        <ReportView onBack={() => navigate('/home')} />
      </div>
    </AppShell>
  )
}

export default ReportsPage
