import { useState, useRef } from 'react'
import { useSession } from '../../../contexts/session-context'
import { Popover } from '../../overlay'
import { useRovingFocus } from '../../../hooks/use-roving-focus'
import { useWorkspaceSwitcher } from '../hooks/use-workspace-switcher'
import { WorkspaceListItem } from '../components/workspace-list-item'

export const SidebarWorkspaceSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const { activeWorkspace, availableWorkspaces, switchWorkspace, refreshWorkspaces, refreshAccounts } = useSession()
  const { switchingId, handleSwitch } = useWorkspaceSwitcher({
    activeWorkspaceId: activeWorkspace?.tenant_id,
    switchWorkspace,
    onSuccess: () => setIsOpen(false),
    refreshAfterSwitch: async () => {
      await refreshAccounts()
      await refreshWorkspaces()
    },
    reloadOnSuccess: false,
  })
  const { handleKeyDown } = useRovingFocus({ selector: '[data-workspace-item]' })

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-lg bg-linear-to-br from-utility-info-500 to-utility-purple-600 flex items-center justify-center label-sm text-white hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-utility-info-500 focus:ring-offset-2"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Switch workspace. Current: ${activeWorkspace?.name || 'None'}`}
      >
        {activeWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
      </button>

      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={triggerRef}
        placement="right-start"
        className="w-72"
      >

        {/* Workspace List */}
        <div className="flex flex-col gap-1 px-2 py-2 max-h-64 overflow-y-auto" role="menu">
          {availableWorkspaces.length === 0 ? (
            <div className="px-3 py-4 text-center text-quaternary paragraph-sm">
              No workspaces yet
            </div>
          ) : (
            availableWorkspaces.map((workspace, index) => (
              <WorkspaceListItem
                key={workspace.tenant_id}
                workspace={workspace}
                isActive={workspace.tenant_id === activeWorkspace?.tenant_id}
                isSwitching={switchingId === workspace.tenant_id}
                onSelect={handleSwitch}
                dataAttribute="true"
                onKeyDown={(e) => handleKeyDown(e, index)}
              />
            ))
          )}
        </div>

      </Popover>
    </>
  )
}
