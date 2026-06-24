import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { TopBar } from '../components/top-bar'
import { useAppShellActions } from '../hooks/use-app-shell-actions'
import { BuilderChat } from '../features/campaigns/components/empty-state/builder-chat'

// /campaigns/new — build a campaign from scratch (chat or brief upload). Also the
// destination when the workspace has no campaigns yet.
const NewCampaignPage = () => {
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
      <div className="campaign-workspace w-full h-dvh flex flex-col overflow-hidden">
        <TopBar title="Campaigns" onBack={() => navigate('/home')} />
        <div className="flex-1 min-h-0">
          <BuilderChat />
        </div>
      </div>
    </AppShell>
  )
}

export default NewCampaignPage
