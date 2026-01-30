import type { ReactNode } from 'react'
import { useSession } from '../../../contexts/session-context'
import { Icon } from '../../../components/icon'

interface ChatLayoutProps {
  children: ReactNode
  onIntegrationsClick?: () => void
  onNewChat?: () => void
}

export const ChatLayout = ({ children, onIntegrationsClick, onNewChat }: ChatLayoutProps) => {
  const { user } = useSession()

  return (
    <div className="flex h-full w-full bg-white">
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>

      {/* Mobile Header - Only on small screens */}
      <div className="fixed top-0 left-0 right-0 md:hidden z-20 bg-white border-b border-gray-100 px-4 py-1 flex items-center justify-between">
        <div className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-semibold text-xs">
          <img src="/icons/mia-logo.png" alt="MIA" className="w-full h-full" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewChat}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
            title="New chat"
          >
            <Icon.pencil_line size={18} />
          </button>
          <button
            onClick={onIntegrationsClick}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
            title="Integrations"
          >
            <Icon.globe_01 size={18} />
          </button>
          <button
            className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-medium text-yellow-900"
            title={user?.name || 'User'}
          >
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatLayout
