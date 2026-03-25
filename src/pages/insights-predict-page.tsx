import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import PredictInsights from '../features/insights/views/predict-insights'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const InsightsPredictPage = () => {
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
        <PredictInsights onBack={() => navigate('/home')} />
      </div>
    </AppShell>
  )
}

export default InsightsPredictPage
