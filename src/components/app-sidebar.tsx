import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/session-context'
import { useTheme } from '../contexts/theme-context'
import { useAppShellActions } from '../hooks/use-app-shell-actions'
import { useFeatures } from '../features/workspace/hooks/use-features'
import { useExperience } from '../features/workspace/hooks/use-experience'
import { SHOW_HIDDEN_PAGES } from '../constants/nav'
import { queryClient } from '../lib/query-client'
import { fetchBoard } from '../features/campaign-builder/api'
import { useRecentConversations } from '../features/shell/hooks/use-recent-conversations'
import { RecentChatsPanel } from '../features/shell/views/recent-chats-panel'
import { CommandPaletteTrigger } from '../features/shell/views/command-palette-trigger'
import { SidebarWorkspaceButton } from '../features/shell/views/sidebar-workspace-button'
import { SidebarAccount } from '../features/shell/views/sidebar-account'
import { ChevronLeftDouble } from './icon/chevron-left-double'
import { ChevronRight } from './icon/chevron-right'
import { ChevronRightDouble } from './icon/chevron-right-double'
import { Calendar } from './icon/calendar'
import { Edit03 } from './icon/edit-03'
import { File02 } from './icon/file-02'
import { Globe01 } from './icon/globe-01'
import { Home03 } from './icon/home-03'
import { MessageChatSquare } from './icon/message-chat-square'
import { Monitor01 } from './icon/monitor-01'
import { Moon01 } from './icon/moon-01'
import { Plus } from './icon/plus'
import { Settings01 } from './icon/settings-01'
import { Sun } from './icon/sun'
import { Target01 } from './icon/target-01'
import { Users01 } from './icon/users-01'
import { Wallet01 } from './icon/wallet-01'
import { ClipboardCheck } from './icon/clipboard-check'
import { SegmentedControl, type SegmentedControlOption } from './segmented-control'


const COLLAPSE_KEY = 'mia:sidebar-collapsed'

interface NavItemProps {
  icon: ReactNode
  label: string
  active?: boolean
  collapsed?: boolean
  onClick: () => void
  trailing?: ReactNode
  className?: string
  /** Start loading the page before the click (hover or keyboard focus). */
  onPrefetch?: () => void
}

const NavItem = ({
  icon,
  label,
  active,
  collapsed,
  onClick,
  trailing,
  className = '',
  onPrefetch,
}: NavItemProps) => (
  <button
    onClick={onClick}
    onMouseEnter={onPrefetch}
    onFocus={onPrefetch}
    title={collapsed ? label : undefined}
    className={`w-full py-2.5 rounded-lg flex items-center gap-3 paragraph-sm transition-colors relative ${
      collapsed ? 'justify-center px-0' : 'px-3'
    } ${active ? 'bg-secondary text-primary' : 'text-secondary hover:bg-secondary'} ${className}`}
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

// Hovering a nav item starts loading its page's code (and, where cheap, its data), so the click
// feels instant (19 Nov 2026). Each import runs once; later calls are free.
const PREFETCH: Record<string, () => unknown> = {
  settings: () => import('../pages/workspace-settings-page'),
  builder: () => import('../pages/campaign-board-page'),
  reports: () => import('../pages/reports-page'),
  integrations: () => import('../pages/integrations-page'),
  home: () => import('../pages/chat-page'),
}
const prefetched = new Set<string>()
const prefetch = (key: string) => {
  if (prefetched.has(key) || !PREFETCH[key]) return
  prefetched.add(key)
  void Promise.resolve(PREFETCH[key]()).catch(() => prefetched.delete(key))
}

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
  // Per-workspace feature flags (progressive disclosure). Everything defaults ON; a flag
  // hides a surface, it never removes it. Workspace Settings is deliberately ungated.
  const { isEnabled: isFeatureEnabled } = useFeatures()
  const { isBasic } = useExperience()

  // "Scheduled" cue (Basic home): blink the Posts item five times so people see where it went.
  const [blinkPosts, setBlinkPosts] = useState(false)
  useEffect(() => {
    const onBlink = (ev: Event) => {
      if ((ev as CustomEvent<{ key?: string }>).detail?.key !== 'posts') return
      setBlinkPosts(false)
      requestAnimationFrame(() => setBlinkPosts(true))
      window.setTimeout(() => setBlinkPosts(false), 4500)
    }
    window.addEventListener('mia:blink-nav', onBlink)
    return () => window.removeEventListener('mia:blink-nav', onBlink)
  }, [])
  const actions = useAppShellActions()
  const { conversations, status: chatsStatus, load, remove, rename, togglePin } = useRecentConversations(
    sessionId,
    activeWorkspace?.tenant_id,
  )

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

  // Going anywhere else closes the slide-over: it used to stay open (and empty) across
  // routes until a hard refresh.
  useEffect(() => {
    setShowChats(false)
  }, [location.pathname, activeWorkspace?.tenant_id])

  const path = location.pathname
  const activeKey = path.startsWith('/campaign-builder')
    ? 'builder'
    : path.startsWith('/integrations')
    ? 'integrations'
    : path.startsWith('/posts')
      ? 'posts'
      : path.startsWith('/campaigns')
        ? 'campaigns'
        : path.startsWith('/scheduler')
          ? 'scheduler'
          : path.startsWith('/reports')
              ? 'reports'
              : path.startsWith('/budget-tracker')
                ? 'budget'
                : path.startsWith('/memo')
                  ? 'memo'
                  : path.startsWith('/settings/workspace')
                    ? 'settings'
                    : ''

  const themeOptions: Array<SegmentedControlOption<typeof theme>> = [
    { value: 'system', label: 'Auto', icon: <Monitor01 size={16} /> },
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon01 size={16} /> },
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
      className={`hidden md:flex shrink-0 flex-col border-r border-secondary bg-primary print:hidden relative overflow-hidden transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[4.5rem]' : 'w-[16.5rem]'
      }`}
      // overflow:hidden still lets the browser scroll this box sideways (focus landing on a
      // button in the off-screen chats panel, find-in-page, scroll-into-view): the whole
      // sidebar then sat ~50px to the left, text clipped and the chats panel's back
      // chevron peeking in at the right edge (Firefox, 30 Sep 2026). It never scrolls.
      onScroll={(e) => {
        if (e.currentTarget.scrollLeft || e.currentTarget.scrollTop) {
          e.currentTarget.scrollLeft = 0
          e.currentTarget.scrollTop = 0
        }
      }}
    >
      {/* Main panel */}
      <div
        inert={showChats}
        className={`absolute inset-0 flex flex-col min-h-0 transition-transform duration-300 ease-out ${
          showChats ? '-translate-x-4 opacity-0 pointer-events-none' : 'translate-x-0'
        }`}
      >
        <div className={`pt-3 ${collapsed ? 'p-2 flex justify-center' : 'p-2'}`}>
          <SidebarWorkspaceButton collapsed={collapsed} />
        </div>

        {/* Agency (19 Nov 2026): no search box in the sidebar; Cmd/Ctrl+K still opens search. */}
        {isBasic && (
          <div className={`pb-2 ${collapsed ? 'px-2 flex justify-center' : 'px-3'}`}>
            <CommandPaletteTrigger variant={collapsed ? 'icon' : 'pill'} fullWidth={!collapsed} />
          </div>
        )}

        <div className="border-t border-tertiary mx-3" />

        <nav
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 ${collapsed ? 'px-2' : 'px-3'}`}
          role="menu"
        >
          {/* Agency: "Home" (a fresh chat on the home screen). Basic keeps "New Chat". */}
          <NavItem
            icon={isBasic ? <Edit03 size={18} /> : <Home03 size={18} />}
            label={isBasic ? 'New Chat' : 'Home'}
            onPrefetch={() => prefetch('home')}
            collapsed={collapsed}
            active={!isBasic && path === '/home'}
            onClick={() => actions.onNewChat()}
          />
          {/* Agency: New workspace moved into the workspace switcher (19 Nov 2026). */}
          {isFeatureEnabled('new_workspace') && isBasic && (
            <NavItem
              icon={<Plus size={18} />}
              label="New Workspace"
              collapsed={collapsed}
              onClick={() => actions.onNewWorkspace()}
            />
          )}
          {/* Basic reaches Connections from Workspace settings. They are set up once and
              then only revisited when something breaks, which does not earn a nav slot. */}
          {isFeatureEnabled('integrations') && !isBasic && (
            <NavItem
              icon={<Globe01 size={18} />}
              label="Integrations"
              onPrefetch={() => prefetch('integrations')}
              collapsed={collapsed}
              active={activeKey === 'integrations'}
              onClick={actions.onIntegrationsClick}
            />
          )}
          {/* Agency: the old Campaigns pages moved to Workspace Settings → Old campaigns
              (agency clean-up 19 Nov). Basic keeps its own Campaigns item. */}
          {isFeatureEnabled('campaigns') && isBasic && (
            <NavItem
              icon={<Target01 size={18} />}
              label="Campaigns"
              collapsed={collapsed}
              active={activeKey === 'campaigns'}
              onClick={actions.onCampaignsClick}
            />
          )}
          {isFeatureEnabled('campaigns') && !isBasic && (
            // The new builder's board: every agency user since 19 Nov (was staff only).
            <NavItem
              icon={<Target01 size={18} />}
              label="Campaign builder"
              onPrefetch={() => {
                prefetch('builder')
                // its list too: the board reads ['campaign-board', tenant] (shown at once on click)
                if (activeWorkspace?.tenant_id && sessionId)
                  void queryClient.prefetchQuery({
                    queryKey: ['campaign-board', activeWorkspace.tenant_id],
                    queryFn: () => fetchBoard(sessionId, activeWorkspace.tenant_id),
                    staleTime: 30_000,
                  })
              }}
              collapsed={collapsed}
              active={activeKey === 'builder'}
              onClick={() => navigate('/campaign-builder')}
            />
          )}
          {/* Posts is a Basic feature. */}
          {isFeatureEnabled('posts') && isBasic && (
            <NavItem
              icon={<Calendar size={18} />}
              label="Posts"
              collapsed={collapsed}
              active={activeKey === 'posts'}
              onClick={actions.onPostsClick}
              className={blinkPosts ? 'nav-blink' : ''}
            />
          )}
          {/* Agency: Scheduler, Budget Tracker and Weekly Memo are hidden (19 Nov); Basic as before. The pages and
              routes stay, and emails still link to /memo. */}
          {isFeatureEnabled('scheduler') && (isBasic || SHOW_HIDDEN_PAGES) && (
            <NavItem
              icon={<Users01 size={18} />}
              label="Scheduler"
              collapsed={collapsed}
              active={activeKey === 'scheduler'}
              onClick={() => navigate('/scheduler')}
            />
          )}
          {isFeatureEnabled('reports') && (
            <NavItem
              icon={<File02 size={18} />}
              label="Reports"
              onPrefetch={() => prefetch('reports')}
              collapsed={collapsed}
              active={activeKey === 'reports'}
              onClick={actions.onReportsClick}
            />
          )}
          {isFeatureEnabled('budget_tracker') && (isBasic || SHOW_HIDDEN_PAGES) && (
            <NavItem
              icon={<Wallet01 size={18} />}
              label="Budget Tracker"
              collapsed={collapsed}
              active={activeKey === 'budget'}
              onClick={() => navigate('/budget-tracker')}
            />
          )}
          {isFeatureEnabled('weekly_memo') && (isBasic || SHOW_HIDDEN_PAGES) && (
            <NavItem
              icon={<ClipboardCheck size={18} />}
              label="Weekly Memo"
              collapsed={collapsed}
              active={activeKey === 'memo'}
              onClick={() => navigate('/memo')}
            />
          )}
          {/* Basic reaches Settings from the workspace menu at the top, so it does not
              also sit here. Team and Agency keep it inline. */}
          {!isBasic && (
            <NavItem
              icon={<Settings01 size={18} />}
              label="Settings"
              onPrefetch={() => prefetch('settings')}
              collapsed={collapsed}
              active={activeKey === 'settings'}
              onClick={actions.onWorkspaceSettings}
            />
          )}

          <div className="border-t border-tertiary my-2" />

          <NavItem
            icon={<MessageChatSquare size={18} />}
            label="Recent Chats"
            collapsed={collapsed}
            onClick={openRecentChats}
            trailing={
              <span className="flex items-center gap-1.5">
                {conversations.length > 0 && (
                  <span className="paragraph-xs text-quaternary">{conversations.length}</span>
                )}
                <ChevronRight size={16} className="text-quaternary" />
              </span>
            }
          />

          {!collapsed && !isBasic && (
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

          {/* Agency Help lives in Settings → Help (Josh, 20 Nov 2026). */}
        </nav>

        {/* Agency: who is signed in, with Settings and Sign out in a menu and the collapse arrow
            beside it, one row instead of three (Josh, 20 Nov 2026). Basic signs out from the
            workspace menu at the top and keeps its own collapse bar below. */}
        {!isBasic && (
          <SidebarAccount
            name={user?.name || 'User'}
            email={user?.email || ''}
            pictureUrl={user?.picture_url}
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            onSettings={actions.onWorkspaceSettings}
            onSignOut={actions.onLogout}
          />
        )}

        {/* Collapse toggle (Basic) */}
        {isBasic && (
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex items-center gap-2 py-2 border-t border-tertiary text-quaternary hover:text-secondary hover:bg-secondary transition-colors ${
            collapsed ? 'justify-center px-0' : 'px-4 justify-start'
          }`}
        >
          {collapsed ? (
            <ChevronRightDouble size={18} />
          ) : (
            <>
              <ChevronLeftDouble size={16} />
              <span className="paragraph-xs">Collapse</span>
            </>
          )}
        </button>
        )}
      </div>

      {/* Recent chats slide-over (only meaningful when expanded). Inert while off-screen, so
          nothing in it can take focus and drag the sidebar sideways. */}
      <div
        inert={!showChats}
        className={`absolute inset-0 flex flex-col min-h-0 bg-primary transition-transform duration-300 ease-out ${
          showChats ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <RecentChatsPanel
          conversations={conversations}
          status={chatsStatus}
          onRetry={() => void load()}
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
