import { AppShell } from '../components/app-shell'
import { TopBar } from '../components/top-bar'
import { CreativeStudioView } from '../features/creative-studio/creative-studio-view'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const CreativeStudioPage = () => {
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
      <div className="w-full h-full flex flex-col min-h-0">
        <TopBar title="Mia Create" />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <CreativeStudioView />
        </div>
      </div>
    </AppShell>
  )
}

export default CreativeStudioPage
