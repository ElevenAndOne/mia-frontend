import { SidebarWorkspaceSwitcher } from '../features/workspace/views/sidebar-workspace-switcher'
import { SidebarUserMenu } from '../features/shell/views/sidebar-user-menu'

interface AppSidebarProps {
  onLogout: () => void
  onWorkspaceSettings?: () => void
  onIntegrationsClick?: () => void
  onCampaignsClick?: () => void
  onPredictClick?: () => void
  onReportsClick?: () => void
  onHelpClick?: () => void
  onNewWorkspace?: () => void
}

export const AppSidebar = ({
  onLogout,
  onWorkspaceSettings,
  onIntegrationsClick,
  onCampaignsClick,
  onPredictClick,
  onReportsClick,
  onHelpClick,
  onNewWorkspace,
}: AppSidebarProps) => {
  return (
    <aside className="hidden md:flex w-14 flex-col items-center py-4 border-r border-tertiary bg-primary">
      {/* Workspace Switcher */}
      <div className="mb-4">
        <SidebarWorkspaceSwitcher />
      </div>

      {/* Bottom section - User Menu */}
      <div className="mt-auto">
        <SidebarUserMenu
          onWorkspaceSettings={onWorkspaceSettings}
          onIntegrationsClick={onIntegrationsClick}
          onCampaignsClick={onCampaignsClick}
          onPredictClick={onPredictClick}
          onReportsClick={onReportsClick}
          onHelpClick={onHelpClick}
          onNewWorkspace={onNewWorkspace}
          onLogout={onLogout}
        />
      </div>
    </aside>
  )
}

export default AppSidebar
