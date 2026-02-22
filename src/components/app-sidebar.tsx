import { Icon } from './icon'
import { SidebarWorkspaceSwitcher } from '../features/workspace/views/sidebar-workspace-switcher'
import { SidebarUserMenu } from '../features/shell/views/sidebar-user-menu'

interface AppSidebarProps {
  onNewChat?: () => void
  onIntegrationsClick?: () => void
  onHelpClick?: () => void
  onLogout: () => void
  onWorkspaceSettings?: () => void
}

export const AppSidebar = ({
  onNewChat,
  onIntegrationsClick,
  onHelpClick,
  onLogout,
  onWorkspaceSettings
}: AppSidebarProps) => {
  return (
    <aside className="hidden md:flex w-14 flex-col items-center py-4 border-r border-tertiary bg-primary">
      {/* Workspace Switcher */}
      <div className="mb-4">
        <SidebarWorkspaceSwitcher />
      </div>

      {/* Nav Icons */}
      <nav className="flex flex-col items-center gap-4">
        <button
          onClick={onNewChat}
          data-track-id="sidebar-new-chat"
          className="w-9 h-9 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
          title="New chat"
        >
          <Icon.pencil_line size={20} />
        </button>
      </nav>

      {/* Bottom section - User Menu */}
      <div className="mt-auto">
        <SidebarUserMenu
          onIntegrationsClick={onIntegrationsClick}
          onHelpClick={onHelpClick}
          onWorkspaceSettings={onWorkspaceSettings}
          onLogout={onLogout}
        />
      </div>
    </aside>
  )
}

export default AppSidebar
