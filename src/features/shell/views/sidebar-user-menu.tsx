import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { useTheme } from '../../../contexts/theme-context'
import { Popover } from '../../overlay'
import { Icon } from '../../../components/icon'
import { SegmentedControl, type SegmentedControlOption } from '../../../components/segmented-control'
import { UserAvatar } from '../../../components/user-avatar'
import { fetchRecentConversations, deleteConversation } from '../../chat/services/chat-service'
import type { RecentConversation } from '../../chat/services/chat-service'

type MenuView = 'main' | 'chats'

function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface SidebarUserMenuProps {
  onWorkspaceSettings?: () => void
  onIntegrationsClick?: () => void
  onCampaignsClick?: () => void
  onHelpClick?: () => void
  onNewWorkspace?: () => void
  onLogout: () => void
}

export const SidebarUserMenu = ({
  onWorkspaceSettings,
  onIntegrationsClick,
  onCampaignsClick,
  onHelpClick,
  onNewWorkspace,
  onLogout,
}: SidebarUserMenuProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<MenuView>('main')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { user, activeWorkspace, sessionId } = useSession()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (isOpen && sessionId) {
      setView('main')
      fetchRecentConversations(sessionId).then(setRecentConversations)
      setConfirmingId(null)
    }
  }, [isOpen, sessionId])

  const handleDeleteClick = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    setConfirmingId(prev => prev === convId ? null : convId)
  }

  const handleConfirmDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    if (!sessionId) return
    setDeletingId(convId)
    const ok = await deleteConversation(sessionId, convId)
    if (ok) setRecentConversations(prev => prev.filter(c => c.conversation_id !== convId))
    setDeletingId(null)
    setConfirmingId(null)
  }

  const themeOptions: Array<SegmentedControlOption<typeof theme>> = [
    { value: 'system', label: 'Auto', icon: <Icon.monitor_01 size={16} /> },
    { value: 'light', label: 'Light', icon: <Icon.sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Icon.moon_01 size={16} /> },
  ]

  const handleClose = () => setIsOpen(false)

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none focus:ring-2 focus:ring-utility-info-500 focus:ring-offset-2 rounded-full"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`User menu for ${user?.name || 'User'}`}
      >
        <UserAvatar
          name={user?.name || 'User'}
          imageUrl={user?.picture_url}
          size="sm"
        />
      </button>

      <Popover
        isOpen={isOpen}
        onClose={handleClose}
        anchorRef={triggerRef}
        placement="right-end"
        className="w-72"
      >
        {view === 'main' ? (
          <>
            {/* User Header */}
            <div className="px-4 py-4 border-b border-tertiary">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={user?.name || 'User'}
                  imageUrl={user?.picture_url}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="label-md text-primary truncate">{user?.name || 'User'}</p>
                  <p className="paragraph-sm text-tertiary truncate">{user?.email || ''}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2" role="menu">
              {onNewWorkspace && (
                <button
                  onClick={() => { handleClose(); onNewWorkspace() }}
                  className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
                  role="menuitem"
                >
                  <Icon.plus size={18} className="text-tertiary" />
                  <span>New Workspace</span>
                </button>
              )}

              {onIntegrationsClick && (
                <button
                  onClick={() => { handleClose(); onIntegrationsClick() }}
                  className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
                  role="menuitem"
                >
                  <Icon.globe_01 size={18} className="text-tertiary" />
                  <span>Integrations</span>
                </button>
              )}

              {onCampaignsClick && (
                <button
                  onClick={() => { handleClose(); onCampaignsClick() }}
                  className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
                  role="menuitem"
                >
                  <Icon.target_01 size={18} className="text-tertiary" />
                  <span>Campaigns</span>
                </button>
              )}

              {onWorkspaceSettings && (
                <button
                  onClick={() => { handleClose(); onWorkspaceSettings() }}
                  className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
                  role="menuitem"
                >
                  <svg className="w-[18px] h-[18px] text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Workspace Settings</span>
                </button>
              )}

              <div className="px-3 py-2.5">
                <SegmentedControl
                  options={themeOptions}
                  value={theme}
                  onChange={setTheme}
                  fullWidth
                />
              </div>

              {onHelpClick && (
                <button
                  onClick={() => { handleClose(); onHelpClick() }}
                  className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
                  role="menuitem"
                >
                  <Icon.help_circle size={18} className="text-tertiary" />
                  <span>Help</span>
                </button>
              )}

              <div className="border-t border-tertiary my-1" />

              {/* Recent Chats row */}
              <button
                onClick={() => setView('chats')}
                className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors"
                role="menuitem"
              >
                <Icon.message_chat_square size={18} className="text-tertiary" />
                <span className="flex-1">Recent Chats</span>
                {recentConversations.length > 0 && (
                  <span className="paragraph-xs text-quaternary">{recentConversations.length}</span>
                )}
                <Icon.chevron_right size={16} className="text-quaternary" />
              </button>

              <div className="border-t border-tertiary my-1" />

              <button
                onClick={() => { handleClose(); onLogout() }}
                className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-error hover:bg-error-primary transition-colors"
                role="menuitem"
              >
                <Icon.log_out_01 size={18} />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Active Workspace Indicator */}
            {activeWorkspace && (
              <div className="px-4 py-3 border-t border-tertiary">
                <p className="paragraph-xs text-quaternary mb-1">Active Workspace</p>
                <p className="paragraph-sm text-primary truncate">{activeWorkspace.name}</p>
              </div>
            )}
          </>
        ) : (
          /* Chats view */
          <div className="flex flex-col" style={{ minHeight: '320px' }}>
            {/* Header */}
            <div className="px-4 py-4 border-b border-tertiary flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView('main')}
                  className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
                  aria-label="Back to menu"
                >
                  <Icon.chevron_left size={20} />
                </button>
                <h2 className="label-md text-primary">Recent Chats</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
                aria-label="Close menu"
              >
                <Icon.x_close size={20} />
              </button>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto p-2">
              {recentConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
                  <Icon.message_chat_square size={28} className="text-quaternary" />
                  <p className="paragraph-sm text-secondary">No recent chats yet</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentConversations.map((conv) => {
                    const isConfirming = confirmingId === conv.conversation_id
                    const isDeleting = deletingId === conv.conversation_id
                    return (
                      <div key={conv.conversation_id} className="relative group">
                        <button
                          onClick={() => {
                            navigate(location.pathname, { state: { loadConversationId: conv.conversation_id } })
                            handleClose()
                          }}
                          className="w-full px-3 py-2.5 rounded-lg flex items-start gap-2 text-left hover:bg-secondary transition-colors"
                        >
                          <Icon.message_chat_square size={15} className="text-quaternary shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0 pr-8">
                            <p className="paragraph-sm text-secondary truncate">{conv.title || 'Chat'}</p>
                            <p className="paragraph-xs text-quaternary mt-0.5">{formatRelativeDate(conv.last_at)}</p>
                          </div>
                        </button>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {isConfirming ? (
                            <>
                              <button
                                onClick={(e) => handleConfirmDelete(e, conv.conversation_id)}
                                disabled={isDeleting}
                                className="px-2 py-1 rounded-md bg-error-primary text-error paragraph-xs hover:opacity-80 transition-opacity disabled:opacity-40"
                              >
                                {isDeleting ? '...' : 'Delete'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmingId(null) }}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary transition-colors"
                              >
                                <Icon.x_close size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => handleDeleteClick(e, conv.conversation_id)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary hover:text-secondary transition-all"
                            >
                              <Icon.trash_01 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Popover>
    </>
  )
}
