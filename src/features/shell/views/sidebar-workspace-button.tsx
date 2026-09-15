import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { ChevronDown } from '../../../components/icon/chevron-down'
import { HelpCircle } from '../../../components/icon/help-circle'
import { LogOut01 } from '../../../components/icon/log-out-01'
import { Palette } from '../../../components/icon/palette'
import { Settings01 } from '../../../components/icon/settings-01'
import { Popover } from '../../overlay'
import { SegmentedControl, type SegmentedControlOption } from '../../../components/segmented-control'
import { Monitor01 } from '../../../components/icon/monitor-01'
import { Moon01 } from '../../../components/icon/moon-01'
import { Sun } from '../../../components/icon/sun'
import { useTheme } from '../../../contexts/theme-context'
import { useAppShellActions } from '../../../hooks/use-app-shell-actions'
import { useExperience } from '../../workspace/hooks/use-experience'
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
 * Basic has one workspace, so there is nothing to switch to. The control keeps its place
 * and its shape and becomes the one menu for everything about *them*: their brand, their
 * workspace, how Mia looks, help, and the way out.
 *
 * This is why the sidebar can drop its Settings item, its Help item and the name block
 * pinned to the bottom — on Basic all three were restating what the person already knew.
 */
const BasicWorkspaceMenu = ({ onDone }: { onDone: () => void }) => {
  const navigate = useNavigate()
  const { onLogout } = useAppShellActions()
  const { theme, setTheme } = useTheme()
  const themeOptions: Array<SegmentedControlOption<typeof theme>> = [
    { value: 'system', label: 'Auto', icon: <Monitor01 size={14} /> },
    { value: 'light', label: 'Light', icon: <Sun size={14} /> },
    { value: 'dark', label: 'Dark', icon: <Moon01 size={14} /> },
  ]

  const go = (to: string) => {
    navigate(to)
    onDone()
  }

  const Row = ({
    icon,
    label,
    sub,
    onClick,
    danger,
  }: {
    icon: React.ReactNode
    label: string
    sub?: string
    onClick: () => void
    danger?: boolean
  }) => (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
        danger ? 'text-error hover:bg-error-primary' : 'text-primary hover:bg-secondary'
      }`}
    >
      <span className="shrink-0 mt-0.5 text-quaternary">{icon}</span>
      <span className="min-w-0">
        <span className="block label-md">{label}</span>
        {sub && <span className="block paragraph-xs text-quaternary">{sub}</span>}
      </span>
    </button>
  )

  return (
    <div className="flex flex-col gap-1 px-2 py-2" role="menu">
      <Row
        icon={<Palette size={17} />}
        label="My brand"
        sub="Colours, fonts, logo and brand voice"
        onClick={() => go('/settings/workspace?tab=brand')}
      />
      <Row
        icon={<Settings01 size={17} />}
        label="Workspace settings"
        sub="Name, connected accounts, Mia's style"
        onClick={() => go('/settings/workspace?tab=members')}
      />

      <div className="border-t border-tertiary my-1" />

      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span className="label-md text-primary">Appearance</span>
        <div className="w-40 shrink-0">
          <SegmentedControl options={themeOptions} value={theme} onChange={setTheme} fullWidth />
        </div>
      </div>
      <Row icon={<HelpCircle size={17} />} label="Help" onClick={() => go('/help')} />

      <div className="border-t border-tertiary my-1" />

      <Row
        icon={<LogOut01 size={17} />}
        label="Sign out"
        danger
        onClick={() => {
          onDone()
          onLogout()
        }}
      />
    </div>
  )
}

/**
 * Workspace switcher trigger for the permanent sidebar: shows the active workspace
 * logo + name and opens the workspace list. When `collapsed`, shows the logo only.
 */
export const SidebarWorkspaceButton = ({ collapsed = false }: { collapsed?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const { isBasic } = useExperience()
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
        aria-label={
          isBasic ? `${name || 'Workspace'} menu` : `Switch workspace. Current: ${name || 'None'}`
        }
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
              {!isBasic && (
                <span className="block paragraph-xs text-quaternary uppercase tracking-wide">
                  Workspace
                </span>
              )}
              <span className="block label-md text-primary truncate">
                {name || 'Select workspace'}
              </span>
            </span>
            <ChevronDown size={16} className="text-quaternary shrink-0" />
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
        {isBasic ? (
          <BasicWorkspaceMenu onDone={() => setIsOpen(false)} />
        ) : (
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
        )}
      </Popover>
    </>
  )
}
