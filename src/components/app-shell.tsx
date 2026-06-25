import type { ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'
import { CommandPaletteProvider } from '../features/shell/context/command-palette-context'
import { CommandPalette } from '../features/shell/views/command-palette'

interface AppShellProps {
  children: ReactNode
  /**
   * Handlers are still accepted so existing pages compile unchanged, but the
   * permanent sidebar now derives its own navigation via useAppShellActions —
   * these props are no longer threaded through.
   */
  onNewChat?: () => void
  onNewWorkspace?: () => void
  onIntegrationsClick?: () => void
  onCampaignsClick?: () => void
  onCreativeStudioClick?: () => void
  onReportsClick?: () => void
  onHelpClick?: () => void
  onLogout?: () => void
  onWorkspaceSettings?: () => void
}

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <CommandPaletteProvider>
      <div className="flex h-full w-full bg-canvas">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 min-h-0">{children}</main>
      </div>
      <CommandPalette />
    </CommandPaletteProvider>
  )
}

export default AppShell
