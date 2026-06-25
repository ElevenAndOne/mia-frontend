import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/session-context'
import { useTheme } from '../contexts/theme-context'
import { useAppShellActions } from '../hooks/use-app-shell-actions'
import { usePlugins } from '../features/plugins/hooks/use-plugins'
import { useRecentConversations } from '../features/shell/hooks/use-recent-conversations'
import { RecentChatsPanel } from '../features/shell/views/recent-chats-panel'
import { CommandPaletteTrigger } from '../features/shell/views/command-palette-trigger'
import { SidebarWorkspaceButton } from '../features/shell/views/sidebar-workspace-button'
import { Icon } from './icon'
import { SegmentedControl, type SegmentedControlOption } from './segmented-control'
import { UserAvatar } from './user-avatar'

const COLLAPSE_KEY = 'mia:sidebar-collapsed'

interface NavItemProps {
  icon: ReactNode
  label: string
  active?: boolean
  collapsed?: boolean
  onClick: () => void
  trailing?: ReactNode
}

const NavItem = ({ icon, label, active, collapsed, onClick, trailing }: NavItemProps) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`w-full py-2.5 rounded-lg flex items-center gap-3 paragraph-sm transition-colors relative ${
      collapsed ? 'justify-center px-0' : 'px-3'
    } ${active ? 'bg-secondary text-primary' : 'text-secondary hover:bg-secondary'}`}
    role="menuitem"
    aria-current={active ? 'page' : undefined}
  >
    {active && (
      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-solid" />
    )}
    <span className={active ? 'text-brand-primary' : 'text-tertiary'}>{icon}</span>
    {!collapsed && <span className="flex-1 text-left">{label}</span>}
    {!collapsed && trailing}
  </button>
)

/**
 * Permanent left navigation panel (desktop). Collapsible to an icons-only rail
 * (preference persisted). Workspace switcher at the top, full nav inline, theme +
 * sign-out + user identity at the bottom, and a Recent Chats slide-over. Mobile keeps
 * the existing Sheet (see ChatLayout / MobileNavigation).
 */
export const AppSidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, activeWorkspace, sessionId } = useSession()
  const { theme, setTheme } = useTheme()
  const { isEnabled } = usePlugins()
  const actions = useAppShellActions()
  const { conversations, load, remove, rename, togglePin } = useRecentConversations(sessionId)

  const [showChats, setShowChats] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    if (showChats) void load()
  }, [showChats, load])

  const path = location.pathname
  const activeKey = path.startsWith('/integrations')
    ? 'integrations'
    : path.startsWith('/campaigns')
      ? 'campaigns'
      : path.startsWith('/creative-studio')
        ? 'mia-create'
        : path.startsWith('/reports')
          ? 'reports'
          : path.startsWith('/budget-tracker')
            ? 'budget'
            : path.startsWith('/settings/workspace')
              ? 'settings'
              : ''

  const themeOptions: Array<SegmentedControlOption<typeof theme>> = [
    { value: 'system', label: 'Auto', icon: <Icon.monitor_01 size={16} /> },
    { value: 'light', label: 'Light', icon: <Icon.sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Icon.moon_01 size={16} /> },
  ]

  const openConversation = (conversationId: string) => {
    setShowChats(false)
    navigate('/home', { state: { loadConversationId: conversationId } })
  }

  // Recent Chats needs the full width — expand first if collapsed, then slide in.
  const openRecentChats = () => {
    if (collapsed) setCollapsed(false)
    setShowChats(true)
  }

  return (
    <aside
      className={`hidden md:flex shrink-0 flex-col border-r border-secondary bg-[var(--ui-sidebar)] print:hidden relative overflow-hidden transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[72px]' : 'w-[264px]'
      }`}
    >
      {/* Main panel */}
      <div
        className={`absolute inset-0 flex flex-col min-h-0 transition-transform duration-300 ease-out ${
          showChats ? '-translate-x-4 opacity-0 pointer-events-none' : 'translate-x-0'
        }`}
      >
        <div className={`pt-3 ${collapsed ? 'p-2 flex justify-center' : 'p-2'}`}>
          <SidebarWorkspaceButton collapsed={collapsed} />
        </div>

        <div className={`pb-2 ${collapsed ? 'px-2 flex justify-center' : 'px-3'}`}>
          <CommandPaletteTrigger variant={collapsed ? 'icon' : 'pill'} fullWidth={!collapsed} />
        </div>

        <div className="border-t border-tertiary mx-3" />

        <nav className={`flex-1 min-h-0 overflow-y-auto py-2 ${collapsed ? 'px-2' : 'px-3'}`} role="menu">
          <NavItem
            icon={<Icon.plus size={18} />}
            label="New Workspace"
            collapsed={collapsed}
            onClick={() => actions.onNewWorkspace()}
          />
          <NavItem
            icon={<Icon.globe_01 size={18} />}
            label="Integrations"
            collapsed={collapsed}
            active={activeKey === 'integrations'}
            onClick={actions.onIntegrationsClick}
          />
          <NavItem
            icon={<Icon.target_01 size={18} />}
            label="Campaigns"
            collapsed={collapsed}
            active={activeKey === 'campaigns'}
            onClick={actions.onCampaignsClick}
          />
          {isEnabled('mia-creative-studio') && (
            <NavItem
              icon={<Icon.stars_01 size={18} />}
              label="Mia Create"
              collapsed={collapsed}
              active={activeKey === 'mia-create'}
              onClick={actions.onCreativeStudioClick}
            />
          )}
          <NavItem
            icon={<Icon.file_02 size={18} />}
            label="Reports"
            collapsed={collapsed}
            active={activeKey === 'reports'}
            onClick={actions.onReportsClick}
          />
          <NavItem
            icon={<Icon.wallet_01 size={18} />}
            label="Budget Tracker"
            collapsed={collapsed}
            active={activeKey === 'budget'}
            onClick={() => navigate('/budget-tracker')}
          />
          <NavItem
            icon={<Icon.settings_01 size={18} />}
            label="Workspace Settings"
            collapsed={collapsed}
            active={activeKey === 'settings'}
            onClick={actions.onWorkspaceSettings}
          />

          <div className="border-t border-tertiary my-2" />

          <NavItem
            icon={<Icon.message_chat_square size={18} />}
            label="Recent Chats"
            collapsed={collapsed}
            onClick={openRecentChats}
            trailing={
              <span className="flex items-center gap-1.5">
                {conversations.length > 0 && (
                  <span className="paragraph-xs text-quaternary">{conversations.length}</span>
                )}
                <Icon.chevron_right size={16} className="text-quaternary" />
              </span>
            }
          />

          {!collapsed && (
            <>
              <div className="border-t border-tertiary my-2" />
              <div className="px-1 py-1.5">
                <SegmentedControl
                  options={themeOptions}
                  value={theme}
                  onChange={setTheme}
                  fullWidth
                />
              </div>
            </>
          )}

          <NavItem
            icon={<Icon.help_circle size={18} />}
            label="Help"
            collapsed={collapsed}
            onClick={actions.onHelpClick}
          />
        </nav>

        {/* Sign out */}
        <div className={`py-1.5 border-t border-tertiary ${collapsed ? 'px-2' : 'px-3'}`}>
          <button
            onClick={actions.onLogout}
            title={collapsed ? 'Sign Out' : undefined}
            className={`w-full py-2.5 rounded-lg flex items-center gap-3 paragraph-sm text-error hover:bg-error-primary transition-colors ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
            role="menuitem"
          >
            <Icon.log_out_01 size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* User identity */}
        <div
          className={`flex items-center gap-3 py-3 border-t border-tertiary ${
            collapsed ? 'justify-center px-2' : 'px-4'
          }`}
        >
          <UserAvatar name={user?.name || 'User'} imageUrl={user?.picture_url} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="label-md text-primary truncate">{user?.name || 'User'}</p>
              <p className="paragraph-xs text-quaternary truncate">
                {activeWorkspace?.name || user?.email || ''}
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex items-center gap-2 py-2 border-t border-tertiary text-quaternary hover:text-secondary hover:bg-secondary transition-colors ${
            collapsed ? 'justify-center px-0' : 'px-4 justify-start'
          }`}
        >
          {collapsed ? (
            <Icon.chevron_right_double size={18} />
          ) : (
            <>
              <Icon.chevron_left_double size={16} />
              <span className="paragraph-xs">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Recent chats slide-over (only meaningful when expanded) */}
      <div
        className={`absolute inset-0 flex flex-col min-h-0 bg-[var(--ui-sidebar)] transition-transform duration-300 ease-out ${
          showChats ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <RecentChatsPanel
          conversations={conversations}
          onSelect={openConversation}
          onBack={() => setShowChats(false)}
          onClose={() => setShowChats(false)}
          onRemove={remove}
          onRename={rename}
          onTogglePin={togglePin}
        />
      </div>
    </aside>
  )
}

export default AppSidebar
