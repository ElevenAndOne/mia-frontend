import { useState, type ReactNode } from 'react'
import { Icon } from '../../../components/icon'
import { BackButton } from '../../../components/back-button'
import { MobileNavigation } from '../../shell/views/mobile-navigation'

interface ChatLayoutProps {
  children: ReactNode
  hasMessages?: boolean
  onIntegrationsClick?: () => void
  onHelpClick?: () => void
  onNewChat?: () => void
  onLogout?: () => void
  onWorkspaceSettings?: () => void
}

export const ChatLayout = ({
  children,
  hasMessages,
  onIntegrationsClick,
  onHelpClick,
  onNewChat,
  onLogout,
  onWorkspaceSettings
}: ChatLayoutProps) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  return (
    <div className="flex h-full w-full bg-primary">
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {children}
      </main>

      {/* Mobile Header - Only on small screens */}
      <div className="fixed top-0 left-0 right-0 md:hidden z-20 bg-primary border-b border-tertiary px-4 py-1 flex items-center justify-between">
        {/* Left side - Back button (only when chat has messages) or empty space */}
        <div className="flex items-center">
          {hasMessages ? (
            <BackButton onClick={() => onNewChat?.()} label="Back" variant="dark" />
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>

        {/* Right side - Menu button */}
        <button
          onClick={() => setIsMobileNavOpen(true)}
          className="w-9 h-9 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
          aria-label="Open menu"
        >
          <Icon.menu_01 size={20} />
        </button>
      </div>

      {/* Mobile Navigation Sheet */}
      <MobileNavigation
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onNewChat={onNewChat}
        onIntegrationsClick={onIntegrationsClick}
        onHelpClick={onHelpClick}
        onLogout={onLogout}
        onWorkspaceSettings={onWorkspaceSettings}
      />
    </div>
  )
}

export default ChatLayout
