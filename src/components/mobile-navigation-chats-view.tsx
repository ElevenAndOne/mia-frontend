import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './icon'
import { useSession } from '../features/shell/../../contexts/session-context'
import {
  deleteConversation,
  renameConversation,
  pinConversation,
} from '../features/chat/services/chat-service'
import type { RecentConversation } from '../features/chat/services/chat-service'

function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface MobileNavigationChatsViewProps {
  onBack: () => void
  onClose: () => void
  recentConversations: RecentConversation[]
  onLoadConversation: (conversationId: string) => void
  onConversationsChange: (conversations: RecentConversation[]) => void
}

export const MobileNavigationChatsView = ({
  onBack,
  onClose,
  recentConversations,
  onLoadConversation,
  onConversationsChange,
}: MobileNavigationChatsViewProps) => {
  const { sessionId } = useSession()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus()
    else setSearchQuery('')
  }, [showSearch])

  const filteredConversations = searchQuery.trim()
    ? recentConversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : recentConversations

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('[data-chat-menu]')) {
        setMenuOpenId(null)
        setMenuPos(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenId])

  const handleDeleteClick = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    setMenuOpenId(null)
    setConfirmingId((prev) => (prev === convId ? null : convId))
  }

  const handleConfirmDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    if (!sessionId) return
    setDeletingId(convId)
    const ok = await deleteConversation(sessionId, convId)
    if (ok) onConversationsChange(recentConversations.filter((c) => c.conversation_id !== convId))
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
      const updated = recentConversations
        .map((c) =>
          c.conversation_id === conv.conversation_id ? { ...c, is_pinned: newPinned } : c
        )
        .sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
          return new Date(b.last_at || 0).getTime() - new Date(a.last_at || 0).getTime()
        })
      onConversationsChange(updated)
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
      onConversationsChange(
        recentConversations.map((c) =>
          c.conversation_id === convId ? { ...c, title: trimmed } : c
        )
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-tertiary">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
              aria-label="Back to menu"
            >
              <Icon.chevron_left size={20} />
            </button>
            <h2 className="label-md text-primary">Recent Chats</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch((s) => !s)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showSearch ? 'bg-tertiary text-secondary' : 'text-quaternary hover:bg-tertiary hover:text-secondary'}`}
              aria-label="Search chats"
            >
              <Icon.search_sm size={18} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
              aria-label="Close menu"
            >
              <Icon.x_close size={20} />
            </button>
          </div>
        </div>
        {showSearch && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Icon.search_sm
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-quaternary pointer-events-none"
              />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-7 py-1.5 paragraph-sm bg-secondary border border-tertiary rounded-lg text-primary placeholder:text-quaternary outline-none focus:border-secondary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-quaternary hover:text-secondary"
                >
                  <Icon.x_close size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-3">
        {recentConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <Icon.message_chat_square size={32} className="text-quaternary" />
            <p className="paragraph-sm text-secondary">No recent chats yet</p>
            <p className="paragraph-xs text-quaternary">Your conversations will appear here</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <Icon.search_sm size={28} className="text-quaternary" />
            <p className="paragraph-sm text-secondary">No chats match "{searchQuery}"</p>
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
                    onClick={() => !isRenaming && onLoadConversation(conv.conversation_id)}
                    className="w-full px-3 py-3 rounded-lg flex items-start gap-3 text-left hover:bg-secondary transition-colors group"
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <Icon.message_chat_square size={18} className="text-quaternary" />
                      {conv.is_pinned && (
                        <Icon.pin_01
                          size={10}
                          className="absolute -top-1.5 -right-1.5 text-error"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRenameSave(conv.conversation_id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSave(conv.conversation_id)
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full paragraph-sm text-primary bg-tertiary rounded px-1 outline-none"
                        />
                      ) : (
                        <p className="paragraph-sm text-secondary truncate group-hover:text-primary transition-colors">
                          {conv.title || 'Chat'}
                        </p>
                      )}
                      <p className="paragraph-xs text-quaternary mt-0.5">
                        {formatRelativeDate(conv.last_at)}
                      </p>
                    </div>
                  </button>

                  {/* Action buttons */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
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
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmingId(null)
                          }}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary transition-colors"
                        >
                          <Icon.x_close size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleDeleteClick(e, conv.conversation_id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary hover:text-secondary transition-all"
                        >
                          <Icon.trash_01 size={15} />
                        </button>
                        <div className="relative" data-chat-menu>
                          <button
                            onClick={(e) => handleMenuToggle(e, conv.conversation_id)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary hover:text-secondary transition-all"
                          >
                            <Icon.dots_vertical size={15} />
                          </button>
                          {isMenuOpen &&
                            menuPos &&
                            createPortal(
                              <div
                                style={{
                                  position: 'fixed',
                                  top: menuPos.top + 4,
                                  right: menuPos.right,
                                }}
                                className="z-[9999] w-36 bg-primary border border-tertiary rounded-lg shadow-lg overflow-hidden"
                                data-chat-menu
                              >
                                <button
                                  onClick={(e) => handlePin(e, conv)}
                                  className="w-full px-3 py-2.5 text-left paragraph-sm flex items-center gap-2 text-secondary hover:bg-secondary transition-colors"
                                >
                                  <Icon.pin_01 size={15} className="text-quaternary" />
                                  <span>{conv.is_pinned ? 'Unpin' : 'Pin'}</span>
                                </button>
                                <button
                                  onClick={(e) => handleRenameStart(e, conv)}
                                  className="w-full px-3 py-2.5 text-left paragraph-sm flex items-center gap-2 text-secondary hover:bg-secondary transition-colors"
                                >
                                  <Icon.edit_01 size={15} className="text-quaternary" />
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
  )
}
