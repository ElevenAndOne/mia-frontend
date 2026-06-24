import { useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { Icon } from '../../../components/icon'
import { Popover } from '../../overlay'
import { useRovingFocus } from '../../../hooks/use-roving-focus'
import { useWorkspaceSwitcher } from '../../workspace/hooks/use-workspace-switcher'
import { WorkspaceListItem } from '../../workspace/components/workspace-list-item'

const AVATAR_PALETTES_BG = [
  'bg-[#3B5BDB]', 'bg-[#0CA678]', 'bg-[#E67700]', 'bg-[#9C36B5]', 'bg-[#C92A2A]',
  'bg-[#1971C2]', 'bg-[#5C7CFA]', 'bg-[#2F9E44]', 'bg-[#C2255C]', 'bg-[#0E9594]',
]
function getAvatarBg(name: string): string {
  let hash = 2166136261
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }
  return AVATAR_PALETTES_BG[hash % AVATAR_PALETTES_BG.length]
}
function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/**
 * Workspace switcher trigger for the permanent sidebar: shows the active workspace
 * logo + name and opens the workspace list. When `collapsed`, shows the logo only.
 */
export const SidebarWorkspaceButton = ({ collapsed = false }: { collapsed?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const { activeWorkspace, availableWorkspaces, switchWorkspace, refreshWorkspaces, refreshAccounts } =
    useSession()
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

  const name = activeWorkspace?.name
  const logoBg = activeWorkspace?.logo_url ? 'bg-secondary' : name ? getAvatarBg(name) : 'bg-[#3B5BDB]'

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        title={collapsed ? name || 'Switch workspace' : undefined}
        className={`flex items-center rounded-xl hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-utility-info-500 ${
          collapsed ? 'justify-center p-1.5' : 'w-full gap-3 px-3 py-2.5'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Switch workspace. Current: ${name || 'None'}`}
      >
        <span
          className={`w-9 h-9 rounded-lg flex items-center justify-center label-xs font-semibold text-white overflow-hidden shrink-0 ${logoBg}`}
        >
          {activeWorkspace?.logo_url ? (
            <img
              src={activeWorkspace.logo_url}
              alt={name}
              className="w-full h-full object-contain p-1.5"
            />
          ) : name ? (
            getInitials(name)
          ) : (
            'W'
          )}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 min-w-0 text-left">
              <span className="block paragraph-xs text-quaternary uppercase tracking-wide">
                Workspace
              </span>
              <span className="block label-md text-primary truncate">
                {name || 'Select workspace'}
              </span>
            </span>
            <Icon.chevron_down size={16} className="text-quaternary shrink-0" />
          </>
        )}
      </button>

      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={triggerRef}
        placement="bottom-start"
        className="w-72"
      >
        <div className="flex flex-col gap-1 px-2 py-2 max-h-72 overflow-y-auto" role="menu">
          {availableWorkspaces.length === 0 ? (
            <div className="px-3 py-4 text-center text-quaternary paragraph-sm">No workspaces yet</div>
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
