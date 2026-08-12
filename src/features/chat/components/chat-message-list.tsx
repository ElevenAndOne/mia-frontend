import { memo, type RefObject } from 'react'
import ChatMessage from './chat-message'
import type { ChatMessageItem } from '../hooks/use-chat-view.tsx'

interface ChatMessageListProps {
  messages: ChatMessageItem[]
  lastUserMsgRef: RefObject<HTMLDivElement | null>
  onConfirmAction: (messageId: string, overrideParams?: Record<string, unknown>) => void
  onCancelAction: (messageId: string) => void
  onFeedback: (messageId: string, historyId: number, rating: 1 | -1) => void
}

/**
 * The settled (non-streaming) portion of the conversation, memoized as a unit.
 *
 * During a streaming reply, chat-view re-renders ~25×/sec (the reveal tick),
 * but `messages` and the handlers are referentially stable for the whole turn —
 * so this entire subtree bails out and only the live streaming bubble below it
 * re-renders. Without this, every settled message re-ran its markdown parse on
 * every tick (O(n²) over the conversation).
 */
export const ChatMessageList = memo(function ChatMessageList({
  messages,
  lastUserMsgRef,
  onConfirmAction,
  onCancelAction,
  onFeedback,
}: ChatMessageListProps) {
  const visible = messages.filter((m) => !m.hidden)
  const lastUserIdx = visible.reduce((acc, m, i) => (m.role === 'user' ? i : acc), -1)

  return (
    <>
      {visible.map((message, idx) => (
        <div key={message.id} ref={idx === lastUserIdx ? lastUserMsgRef : undefined}>
          <ChatMessage
            role={message.role}
            content={message.content}
            images={message.images}
            pendingAction={message.pendingAction}
            actionStatus={message.actionStatus}
            actionResult={message.actionResult}
            onConfirmAction={
              message.pendingAction
                ? (override) => onConfirmAction(message.id, override)
                : undefined
            }
            onCancelAction={message.pendingAction ? () => onCancelAction(message.id) : undefined}
            feedback={message.feedback}
            onFeedback={
              message.role === 'assistant' && message.historyId != null
                ? (rating) => onFeedback(message.id, message.historyId!, rating)
                : undefined
            }
          />
        </div>
      ))}
    </>
  )
})

export default ChatMessageList
