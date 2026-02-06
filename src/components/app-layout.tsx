import type { ReactNode } from 'react'
import { useNavigation } from '@contexts/navigation-context'
import { AppShell } from './app-shell'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const {
    navigateHome,
    navigateIntegrations,
    navigateHelp,
    navigateWorkspaceSettings,
    handleLogout
  } = useNavigation()

  return (
    <AppShell
      onNewChat={() => navigateHome({ newChat: true })}
      onIntegrationsClick={navigateIntegrations}
      onHelpClick={navigateHelp}
      onLogout={handleLogout}
      onWorkspaceSettings={navigateWorkspaceSettings}
    >
      {children}
    </AppShell>
  )
}

export default AppLayout
