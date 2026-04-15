import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { useTheme } from '../../../contexts/theme-context'
import { Popover } from '../../overlay'
import { Icon } from '../../../components/icon'
import { SegmentedControl, type SegmentedControlOption } from '../../../components/segmented-control'
import { UserAvatar } from '../../../components/user-avatar'
import { fetchRecentConversations, deleteConversation, renameConversation, pinConversation } from '../../chat/services/chat-service'
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
  const renameInputRef = useRef<HTMLInputElement>(null)

  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { user, activeWorkspace, sessionId } = useSession()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchRecentConversations(sessionId).then(setRecentConversations)
    }
  }, [isOpen, sessionId])

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus()
    else setSearchQuery('')
  }, [showSearch])

  const filteredConversations = searchQuery.trim()
    ? recentConversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : recentConversations

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  // Close 3-dot menu on outside click
  useEffect(() => {
    if (!menuOpenId) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('[data-chat-menu]')) { setMenuOpenId(null); setMenuPos(null) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenId])

  const handleClose = () => {
    setIsOpen(false)
    setView('main')
    setMenuOpenId(null)
    setMenuPos(null)
    setConfirmingId(null)
    setRenamingId(null)
    setShowSearch(false)
    setSearchQuery('')
  }

  const handleDeleteClick = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    setMenuOpenId(null)
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

  const handleMenuToggle = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    if (menuOpenId === convId) {
      setMenuOpenId(null)
      setMenuPos(null)
    } else {
      const btn = e.currentTarget as HTMLElement
      const rect = btn.getBoundingClientRect()
      setMenuPos({ top: rect.bottom, right: window.innerWidth - rect.right })
      setMenuOpenId(convId)
    }
  }

  const handlePin = async (e: React.MouseEvent, conv: RecentConversation) => {
    e.stopPropagation()
    setMenuOpenId(null)
    if (!sessionId) return
    const newPinned = await pinConversation(sessionId, conv.conversation_id)
    if (newPinned !== null) {
      setRecentConversations(prev =>
        prev
          .map(c => c.conversation_id === conv.conversation_id ? { ...c, is_pinned: newPinned } : c)
          .sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
            return new Date(b.last_at || 0).getTime() - new Date(a.last_at || 0).getTime()
          })
      )
    }
  }

  const handleRenameStart = (e: React.MouseEvent, conv: RecentConversation) => {
    e.stopPropagation()
    setMenuOpenId(null)
    setRenamingId(conv.conversation_id)
    setRenameValue(conv.title)
  }

  const handleRenameSave = async (convId: string) => {
    const trimmed = renameValue.trim()
    setRenamingId(null)
    if (!trimmed || !sessionId) return
    const ok = await renameConversation(sessionId, convId, trimmed)
    if (ok) {
      setRecentConversations(prev =>
        prev.map(c => c.conversation_id === convId ? { ...c, title: trimmed } : c)
      )
    }
  }

  const themeOptions: Array<SegmentedControlOption<typeof theme>> = [
    { value: 'system', label: 'Auto', icon: <Icon.monitor_01 size={16} /> },
    { value: 'light', label: 'Light', icon: <Icon.sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Icon.moon_01 size={16} /> },
  ]

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
        <UserAvatar name={user?.name || 'User'} imageUrl={user?.picture_url} size="sm" />
      </button>

      <Popover isOpen={isOpen} onClose={handleClose} anchorRef={triggerRef} placement="right-end" className="w-72">
        {view === 'main' ? (
          <>
            {/* User Header */}
            <div className="px-4 py-4 border-b border-tertiary">
              <div className="flex items-center gap-3">
                <UserAvatar name={user?.name || 'User'} imageUrl={user?.picture_url} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="label-md text-primary truncate">{user?.name || 'User'}</p>
                  <p className="paragraph-sm text-tertiary truncate">{user?.email || ''}</p>
                </div>
              </div>
            </div>

            <div className="py-2" role="menu">
              {onNewWorkspace && (
                <button onClick={() => { handleClose(); onNewWorkspace() }} className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors" role="menuitem">
                  <Icon.plus size={18} className="text-tertiary" /><span>New Workspace</span>
                </button>
              )}
              {onIntegrationsClick && (
                <button onClick={() => { handleClose(); onIntegrationsClick() }} className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors" role="menuitem">
                  <Icon.globe_01 size={18} className="text-tertiary" /><span>Integrations</span>
                </button>
              )}
              {onCampaignsClick && (
                <button onClick={() => { handleClose(); onCampaignsClick() }} className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors" role="menuitem">
                  <Icon.target_01 size={18} className="text-tertiary" /><span>Campaigns</span>
                </button>
              )}
              {onWorkspaceSettings && (
                <button onClick={() => { handleClose(); onWorkspaceSettings() }} className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors" role="menuitem">
                  <svg className="w-[18px] h-[18px] text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Workspace Settings</span>
                </button>
              )}
              <div className="px-3 py-2.5">
                <SegmentedControl options={themeOptions} value={theme} onChange={setTheme} fullWidth />
              </div>
              {onHelpClick && (
                <button onClick={() => { handleClose(); onHelpClick() }} className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors" role="menuitem">
                  <Icon.help_circle size={18} className="text-tertiary" /><span>Help</span>
                </button>
              )}

              <div className="border-t border-tertiary my-1" />

              <button onClick={() => setView('chats')} className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-secondary hover:bg-secondary transition-colors" role="menuitem">
                <Icon.message_chat_square size={18} className="text-tertiary" />
                <span className="flex-1">Recent Chats</span>
                {recentConversations.length > 0 && <span className="paragraph-xs text-quaternary">{recentConversations.length}</span>}
                <Icon.chevron_right size={16} className="text-quaternary" />
              </button>

              <div className="border-t border-tertiary my-1" />

              <button onClick={() => { handleClose(); onLogout() }} className="w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 text-error hover:bg-error-primary transition-colors" role="menuitem">
                <Icon.log_out_01 size={18} /><span>Sign Out</span>
              </button>
            </div>

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
            <div className="border-b border-tertiary">
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setView('main'); setShowSearch(false) }} className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors" aria-label="Back to menu">
                    <Icon.chevron_left size={20} />
                  </button>
                  <h2 className="label-md text-primary">Recent Chats</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowSearch(s => !s)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showSearch ? 'bg-tertiary text-secondary' : 'text-quaternary hover:bg-tertiary hover:text-secondary'}`}
                    aria-label="Search chats"
                  >
                    <Icon.search_sm size={18} />
                  </button>
                  <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors" aria-label="Close menu">
                    <Icon.x_close size={20} />
                  </button>
                </div>
              </div>
              {showSearch && (
                <div className="px-4 pb-3">
                  <div className="relative">
                    <Icon.search_sm size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-quaternary pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search chats..."
                      className="w-full pl-7 pr-6 py-1.5 paragraph-xs bg-secondary border border-tertiary rounded-lg text-primary placeholder:text-quaternary outline-none focus:border-secondary"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-quaternary hover:text-secondary">
                        <Icon.x_close size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {recentConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
                  <Icon.message_chat_square size={28} className="text-quaternary" />
                  <p className="paragraph-sm text-secondary">No recent chats yet</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
                  <Icon.search_sm size={24} className="text-quaternary" />
                  <p className="paragraph-xs text-secondary">No chats match "{searchQuery}"</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredConversations.map((conv) => {
                    const isConfirming = confirmingId === conv.conversation_id
                    const isDeleting = deletingId === conv.conversation_id
                    const isMenuOpen = menuOpenId === conv.conversation_id
                    const isRenaming = renamingId === conv.conversation_id

                    return (
                      <div key={conv.conversation_id} className="relative" data-chat-menu>
                        <button
                          onClick={() => {
                            if (isRenaming) return
                            navigate(location.pathname, { state: { loadConversationId: conv.conversation_id } })
                            handleClose()
                          }}
                          className="w-full px-3 py-2.5 rounded-lg flex items-start gap-2 text-left hover:bg-secondary transition-colors"
                        >
                          <div className="relative shrink-0 mt-0.5">
                            <Icon.message_chat_square size={15} className="text-quaternary" />
                            {conv.is_pinned && <Icon.pin_01 size={9} className="absolute -top-1.5 -right-1.5 text-error" />}
                          </div>
                          <div className="flex-1 min-w-0 pr-16">
                            {isRenaming ? (
                              <input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onBlur={() => handleRenameSave(conv.conversation_id)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRenameSave(conv.conversation_id)
                                  if (e.key === 'Escape') setRenamingId(null)
                                }}
                                onClick={e => e.stopPropagation()}
                                className="w-full paragraph-xs text-primary bg-tertiary rounded px-1 outline-none"
                              />
                            ) : (
                              <p className="paragraph-xs text-secondary truncate">{conv.title || 'Chat'}</p>
                            )}
                            <p className="paragraph-xs text-quaternary mt-0.5">{formatRelativeDate(conv.last_at)}</p>
                          </div>
                        </button>

                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5" data-chat-menu>
                          {isConfirming ? (
                            <>
                              <button onClick={(e) => handleConfirmDelete(e, conv.conversation_id)} disabled={isDeleting} className="px-2 py-0.5 rounded-md bg-error-primary text-error paragraph-xs hover:opacity-80 transition-opacity disabled:opacity-40">
                                {isDeleting ? '...' : 'Delete'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmingId(null) }} className="w-5 h-5 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary transition-colors">
                                <Icon.x_close size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={(e) => handleDeleteClick(e, conv.conversation_id)} className="w-6 h-6 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary hover:text-secondary transition-all">
                                <Icon.trash_01 size={13} />
                              </button>
                              <div className="relative" data-chat-menu>
                                <button onClick={(e) => handleMenuToggle(e, conv.conversation_id)} className="w-6 h-6 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary hover:text-secondary transition-all">
                                  <Icon.dots_vertical size={13} />
                                </button>
                                {isMenuOpen && menuPos && createPortal(
                                  <div
                                    style={{ position: 'fixed', top: menuPos.top + 4, right: menuPos.right }}
                                    className="z-[9999] w-32 bg-primary border border-tertiary rounded-lg shadow-lg overflow-hidden"
                                    data-chat-menu
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    <button onClick={(e) => handlePin(e, conv)} className="w-full px-3 py-2 text-left paragraph-xs flex items-center gap-2 text-secondary hover:bg-secondary transition-colors">
                                      <Icon.pin_01 size={13} className="text-quaternary" />
                                      <span>{conv.is_pinned ? 'Unpin' : 'Pin'}</span>
                                    </button>
                                    <button onClick={(e) => handleRenameStart(e, conv)} className="w-full px-3 py-2 text-left paragraph-xs flex items-center gap-2 text-secondary hover:bg-secondary transition-colors">
                                      <Icon.edit_01 size={13} className="text-quaternary" />
                                      <span>Rename</span>
                                    </button>
                                  </div>,
                                  document.body
                                )}
                              </div>
                            </>
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
