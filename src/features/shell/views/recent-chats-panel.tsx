import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../../components/icon'
import type { RecentConversation } from '../../chat/services/chat-service'

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

interface RecentChatsPanelProps {
  conversations: RecentConversation[]
  onSelect: (conversationId: string) => void
  onBack: () => void
  onClose: () => void
  onRemove: (conversationId: string) => Promise<boolean>
  onRename: (conversationId: string, title: string) => void
  onTogglePin: (conversation: RecentConversation) => void
}

/**
 * The "Recent Chats" list shown as a slide-over inside the permanent sidebar:
 * header (back / search / close) + scrollable list with per-row delete, rename and pin.
 */
export const RecentChatsPanel = ({
  conversations,
  onSelect,
  onBack,
  onClose,
  onRemove,
  onRename,
  onTogglePin,
}: RecentChatsPanelProps) => {
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
    if (showSearch) searchInputRef.current?.focus()
    else setSearchQuery('')
  }, [showSearch])

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  // Close the 3-dot menu on outside click
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

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations

  const handleConfirmDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    setDeletingId(convId)
    await onRemove(convId)
    setDeletingId(null)
    setConfirmingId(null)
  }

  const handleMenuToggle = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    if (menuOpenId === convId) {
      setMenuOpenId(null)
      setMenuPos(null)
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setMenuPos({ top: rect.bottom, right: window.innerWidth - rect.right })
      setMenuOpenId(convId)
    }
  }

  const handleRenameSave = (convId: string) => {
    const value = renameValue
    setRenamingId(null)
    onRename(convId, value)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-tertiary shrink-0">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onBack()
                setShowSearch(false)
              }}
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
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-quaternary pointer-events-none"
              />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-7 pr-6 py-1.5 paragraph-xs bg-secondary border border-tertiary rounded-lg text-primary placeholder:text-quaternary outline-none focus:border-secondary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-quaternary hover:text-secondary"
                >
                  <Icon.x_close size={12} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {conversations.length === 0 ? (
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
                      onSelect(conv.conversation_id)
                    }}
                    className="w-full px-3 py-2.5 rounded-lg flex items-start gap-2 text-left hover:bg-secondary transition-colors"
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <Icon.message_chat_square size={15} className="text-quaternary" />
                      {conv.is_pinned && (
                        <Icon.pin_01 size={9} className="absolute -top-1.5 -right-1.5 text-error" />
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
                          className="w-full paragraph-xs text-primary bg-tertiary rounded px-1 outline-none"
                        />
                      ) : (
                        <p className="paragraph-xs text-secondary truncate">{conv.title || 'Chat'}</p>
                      )}
                      <p className="paragraph-xs text-quaternary mt-0.5">
                        {formatRelativeDate(conv.last_at)}
                      </p>
                    </div>
                  </button>

                  <div
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5"
                    data-chat-menu
                  >
                    {isConfirming ? (
                      <>
                        <button
                          onClick={(e) => handleConfirmDelete(e, conv.conversation_id)}
                          disabled={isDeleting}
                          className="px-2 py-0.5 rounded-md bg-error-primary text-error paragraph-xs hover:opacity-80 transition-opacity disabled:opacity-40"
                        >
                          {isDeleting ? '...' : 'Delete'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmingId(null)
                          }}
                          className="w-5 h-5 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary transition-colors"
                        >
                          <Icon.x_close size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpenId(null)
                            setConfirmingId((prev) =>
                              prev === conv.conversation_id ? null : conv.conversation_id
                            )
                          }}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary hover:text-secondary transition-all"
                        >
                          <Icon.trash_01 size={13} />
                        </button>
                        <div className="relative" data-chat-menu>
                          <button
                            onClick={(e) => handleMenuToggle(e, conv.conversation_id)}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-quaternary hover:bg-tertiary hover:text-secondary transition-all"
                          >
                            <Icon.dots_vertical size={13} />
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
                                className="z-[9999] w-32 bg-primary border border-tertiary rounded-lg shadow-lg overflow-hidden"
                                data-chat-menu
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMenuOpenId(null)
                                    onTogglePin(conv)
                                  }}
                                  className="w-full px-3 py-2 text-left paragraph-xs flex items-center gap-2 text-secondary hover:bg-secondary transition-colors"
                                >
                                  <Icon.pin_01 size={13} className="text-quaternary" />
                                  <span>{conv.is_pinned ? 'Unpin' : 'Pin'}</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMenuOpenId(null)
                                    setRenamingId(conv.conversation_id)
                                    setRenameValue(conv.title)
                                  }}
                                  className="w-full px-3 py-2 text-left paragraph-xs flex items-center gap-2 text-secondary hover:bg-secondary transition-colors"
                                >
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
  )
}
