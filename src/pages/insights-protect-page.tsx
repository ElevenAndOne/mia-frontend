import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import InsightPage from '../features/insights/views/insight-page'
import { useInsightRouteParams } from '../features/insights/hooks/use-insight-route-params'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const InsightsProtectPage = () => {
  const navigate = useNavigate()
  const { platforms, dateRange } = useInsightRouteParams()
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
        <InsightPage
          insightType="protect"
          onBack={() => navigate(-1)}
          initialDateRange={dateRange}
          platforms={platforms}
        />
      </div>
    </AppShell>
  )
}

export default InsightsProtectPage
