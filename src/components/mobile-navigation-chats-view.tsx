import { Icon } from './icon'
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
}

export const MobileNavigationChatsView = ({
  onBack,
  onClose,
  recentConversations,
  onLoadConversation,
}: MobileNavigationChatsViewProps) => {
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
            {recentConversations.map((conv) => (
              <button
                key={conv.conversation_id}
                onClick={() => onLoadConversation(conv.conversation_id)}
                className="w-full px-3 py-3 rounded-lg flex items-start gap-3 text-left hover:bg-secondary transition-colors group"
              >
                <Icon.message_chat_square size={18} className="text-quaternary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="paragraph-sm text-secondary truncate group-hover:text-primary transition-colors">
                    {conv.title || 'Chat'}
                  </p>
                  <p className="paragraph-xs text-quaternary mt-0.5">{formatRelativeDate(conv.last_at)}</p>
                </div>
                <Icon.chevron_right size={16} className="text-quaternary shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
