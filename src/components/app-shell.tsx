import type { ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'

interface AppShellProps {
  children: ReactNode
  onNewChat?: () => void
  onIntegrationsClick?: () => void
  onLogout: () => void
  onWorkspaceSettings?: () => void
}

export const AppShell = ({
  children,
  onNewChat,
  onIntegrationsClick,
  onLogout,
  onWorkspaceSettings
}: AppShellProps) => {
  return (
    <div className="flex h-full w-full bg-primary">
      <AppSidebar
        onNewChat={onNewChat}
        onIntegrationsClick={onIntegrationsClick}
        onLogout={onLogout}
        onWorkspaceSettings={onWorkspaceSettings}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  )
}

export default AppShell
