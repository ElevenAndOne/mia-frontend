import type { ReactNode } from 'react'
import { useSession } from '../../../contexts/session-context'

interface ChatLayoutProps {
  children: ReactNode
  onIntegrationsClick?: () => void
  onNewChat?: () => void
}

export const ChatLayout = ({ children, onIntegrationsClick, onNewChat }: ChatLayoutProps) => {
  const { user } = useSession()

  return (
    <div className="flex h-full w-full bg-white">
      {/* Sidebar */}
      <aside className="hidden md:flex w-14 flex-col items-center py-4 border-r border-gray-100">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>

          <button
            onClick={onIntegrationsClick}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            title="Integrations"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button
            onClick={onIntegrationsClick}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
            title="Integrations"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
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
