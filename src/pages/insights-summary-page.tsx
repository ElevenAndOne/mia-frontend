import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import SummaryInsights from '../features/insights/views/summary-insights'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const InsightsSummaryPage = () => {
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
      <div className="w-full h-full">
        <SummaryInsights onBack={() => navigate(-1)} />
      </div>
    </AppShell>
  )
}

export default InsightsSummaryPage
