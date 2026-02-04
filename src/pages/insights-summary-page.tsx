import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import SummaryInsights from '../features/insights/views/summary-insights'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const InsightsSummaryPage = () => {
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
        <SummaryInsights onBack={() => navigate('/home')} />
      </div>
    </AppShell>
  )
}

export default InsightsSummaryPage
