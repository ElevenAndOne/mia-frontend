import { Icon } from './icon'
import { SidebarWorkspaceSwitcher } from './sidebar-workspace-switcher'
import { SidebarUserMenu } from './sidebar-user-menu'

interface AppSidebarProps {
  onNewChat?: () => void
  onIntegrationsClick?: () => void
  onLogout: () => void
  onWorkspaceSettings?: () => void
}

export const AppSidebar = ({
  onNewChat,
  onIntegrationsClick,
  onLogout,
  onWorkspaceSettings
}: AppSidebarProps) => {
  return (
    <aside className="hidden md:flex w-14 flex-col items-center py-4 border-r border-gray-100 bg-white">
      {/* Workspace Switcher */}
      <div className="mb-4">
        <SidebarWorkspaceSwitcher />
      </div>

      {/* Nav Icons */}
      <nav className="flex flex-col items-center gap-4">
        <button
          onClick={onNewChat}
          className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          title="New chat"
        >
          <Icon.pencil_line size={20} />
        </button>
      </nav>

      {/* Bottom section - User Menu */}
      <div className="mt-auto">
        <SidebarUserMenu
          onIntegrationsClick={onIntegrationsClick}
          onWorkspaceSettings={onWorkspaceSettings}
          onLogout={onLogout}
        />
      </div>
    </aside>
  )
}

export default AppSidebar
