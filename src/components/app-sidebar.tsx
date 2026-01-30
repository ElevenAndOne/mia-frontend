import { useSession } from '../contexts/session-context'
import { Icon } from './icon'

interface AppSidebarProps {
  onNewChat?: () => void
  onIntegrationsClick?: () => void
}

export const AppSidebar = ({ onNewChat, onIntegrationsClick }: AppSidebarProps) => {
  const { user } = useSession()

  return (
    <aside className="hidden md:flex w-14 flex-col items-center py-4 border-r border-gray-100 bg-white">
      {/* Logo */}
      <div className="w-12 h-12 flex items-center justify-center mb-4">
        <img src="/icons/mia-logo.png" alt="MIA" className="w-full h-full" />
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

        <button
          onClick={onIntegrationsClick}
          className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          title="Integrations"
        >
          <Icon.globe_01 size={20} />
        </button>
      </nav>

      {/* Bottom section - User avatar */}
      <div className="mt-auto">
        <button
          className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-sm font-medium text-yellow-900"
          title={user?.name || 'User'}
        >
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </button>
      </div>
    </aside>
  )
}

export default AppSidebar
