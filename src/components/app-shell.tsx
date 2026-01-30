import type { ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'

interface AppShellProps {
  children: ReactNode
  onNewChat?: () => void
  onIntegrationsClick?: () => void
}

export const AppShell = ({ children, onNewChat, onIntegrationsClick }: AppShellProps) => {
  return (
    <div className="flex h-full w-full bg-white">
      <AppSidebar onNewChat={onNewChat} onIntegrationsClick={onIntegrationsClick} />
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  )
}

export default AppShell
