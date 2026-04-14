import { useState, useRef, type ReactNode } from 'react'
import { Icon } from '../../../components/icon'
import { BackButton } from '../../../components/back-button'
import { MobileNavigation } from '../../shell/views/mobile-navigation'
import { useSession } from '../../../contexts/session-context'
import { useWorkspaceSwitcher } from '../../workspace/hooks/use-workspace-switcher'
import { WorkspaceListItem } from '../../workspace/components/workspace-list-item'
import { Popover } from '../../overlay'

interface ChatLayoutProps {
  children: ReactNode
  hasMessages?: boolean
  onIntegrationsClick?: () => void
  onCampaignsClick?: () => void
  onHelpClick?: () => void
  onNewChat?: () => void
  onLogout?: () => void
  onWorkspaceSettings?: () => void
  onNewWorkspace?: () => void
  onLoadConversation?: (conversationId: string) => void
}

export const ChatLayout = ({
  children,
  hasMessages,
  onIntegrationsClick,
  onCampaignsClick,
  onHelpClick,
  onNewChat,
  onLogout,
  onWorkspaceSettings,
  onNewWorkspace,
  onLoadConversation,
}: ChatLayoutProps) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false)
  const workspaceBtnRef = useRef<HTMLButtonElement>(null)
  const { activeWorkspace, availableWorkspaces, switchWorkspace, refreshWorkspaces, refreshAccounts } = useSession()

  const { isSwitching, switchingId, handleSwitch } = useWorkspaceSwitcher({
    activeWorkspaceId: activeWorkspace?.tenant_id,
    switchWorkspace,
    onSuccess: () => setIsWorkspaceSwitcherOpen(false),
    refreshAfterSwitch: async () => {
      await refreshAccounts()
      await refreshWorkspaces()
    },
    reloadOnSuccess: false,
  })

  return (
    <div className="flex h-full w-full bg-primary">
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {children}
      </main>

      {/* Mobile Header - Only on small screens */}
      <div className="fixed top-0 left-0 right-0 md:hidden z-20 bg-primary border-b border-tertiary px-4 py-1 flex items-center justify-between">
        {/* Left side - Workspace name (tappable for quick switch) or Back button */}
        <div className="flex items-center">
          {hasMessages ? (
            <BackButton onClick={() => onNewChat?.()} label="Back" variant="dark" />
          ) : (
            <>
              <button
                ref={workspaceBtnRef}
                onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-tertiary transition-colors"
              >
                <span className="paragraph-sm text-secondary font-medium truncate max-w-[200px]">
                  {activeWorkspace?.name || 'MIA'}
                </span>
                <Icon.chevron_down size={14} className="text-quaternary shrink-0" />
              </button>
              <Popover
                isOpen={isWorkspaceSwitcherOpen}
                onClose={() => setIsWorkspaceSwitcherOpen(false)}
                anchorRef={workspaceBtnRef}
                placement="bottom"
                className="w-64"
                mobileAdaptation="none"
              >
                <div className="py-2 max-h-64 overflow-y-auto">
                  {availableWorkspaces.map((ws) => (
                    <WorkspaceListItem
                      key={ws.tenant_id}
                      workspace={ws}
                      isActive={ws.tenant_id === activeWorkspace?.tenant_id}
                      isSwitching={switchingId === ws.tenant_id}
                      onSelect={(id) => { handleSwitch(id); setIsWorkspaceSwitcherOpen(false) }}
                      variant="compact"
                      disabled={isSwitching}
                      activeClassName="bg-secondary border-2 border-utility-success-400"
                      inactiveClassName="hover:bg-secondary"
                      showRoleIcon={false}
                      trailing={
                        ws.tenant_id === activeWorkspace?.tenant_id
                          ? <Icon.check size={18} className="text-white shrink-0" />
                          : switchingId === ws.tenant_id
                            ? <div className="w-4 h-4 border-2 border-primary border-t-utility-brand-600 rounded-full animate-spin shrink-0" />
                            : null
                      }
                    />
                  ))}
                </div>
              </Popover>
            </>
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
        onNewWorkspace={onNewWorkspace}
        onIntegrationsClick={onIntegrationsClick}
        onCampaignsClick={onCampaignsClick}
        onHelpClick={onHelpClick}
        onLogout={onLogout}
        onWorkspaceSettings={onWorkspaceSettings}
        onLoadConversation={onLoadConversation ? (id) => { onLoadConversation(id); setIsMobileNavOpen(false) } : undefined}
      />
    </div>
  )
}

export default ChatLayout
