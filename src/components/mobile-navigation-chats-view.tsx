import { useState } from 'react'
import { Icon } from './icon'
import { useSession } from '../features/shell/../../contexts/session-context'
import { deleteConversation } from '../features/chat/services/chat-service'
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

  const handleDeleteClick = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    setConfirmingId(prev => prev === convId ? null : convId)
  }

  const handleConfirmDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    if (!sessionId) return
    setDeletingId(convId)
    const ok = await deleteConversation(sessionId, convId)
    if (ok) {
      onConversationsChange(recentConversations.filter(c => c.conversation_id !== convId))
    }
    setDeletingId(null)
    setConfirmingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-tertiary flex items-center justify-between">
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
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-tertiary flex items-center justify-center text-quaternary hover:text-secondary transition-colors"
          aria-label="Close menu"
        >
          <Icon.x_close size={20} />
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-3">
        {recentConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <Icon.message_chat_square size={32} className="text-quaternary" />
            <p className="paragraph-sm text-secondary">No recent chats yet</p>
            <p className="paragraph-xs text-quaternary">Your conversations will appear here</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {recentConversations.map((conv) => {
              const isConfirming = confirmingId === conv.conversation_id
              const isDeleting = deletingId === conv.conversation_id

              return (
                <div key={conv.conversation_id} className="relative">
                  <button
                    onClick={() => onLoadConversation(conv.conversation_id)}
                    className="w-full px-3 py-3 rounded-lg flex items-start gap-3 text-left hover:bg-secondary transition-colors group"
                  >
                    <Icon.message_chat_square size={18} className="text-quaternary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="paragraph-sm text-secondary truncate group-hover:text-primary transition-colors">
                        {conv.title || 'Chat'}
                      </p>
                      <p className="paragraph-xs text-quaternary mt-0.5">{formatRelativeDate(conv.last_at)}</p>
                    </div>
                  </button>

                  {/* Delete / confirm buttons */}
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
  )
}
