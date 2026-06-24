import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { BudgetTrackerView } from '../features/budget-tracker/views/budget-tracker-view'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const BudgetTrackerPage = () => {
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
        <BudgetTrackerView onBack={() => navigate('/home')} />
      </div>
    </AppShell>
  )
}

export default BudgetTrackerPage
