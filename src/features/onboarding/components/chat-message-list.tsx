import { AnimatePresence } from 'framer-motion'
import type { RefObject } from 'react'
import type { ChatMessage } from '../onboarding-chat-types'
import { MessageBubble } from './message-bubble'
import { TypingIndicator } from './typing-indicator'

interface ChatMessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
  isStreaming: boolean
  onChoiceSelect: (action: string) => void
  endRef: RefObject<HTMLDivElement | null>
}

export const ChatMessageList = ({ messages, isTyping, isStreaming, onChoiceSelect, endRef}: ChatMessageListProps) => (
  <div className="flex-1 h-full overflow-y-auto px-4 pt-6 pb-6 safe-bottom">
    <div className="flex flex-col gap-3 min-h-full max-w-3xl mx-auto w-full">
      {/* Spacer pushes messages to bottom when content is short */}
      <div className="flex-1" />

      <AnimatePresence>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onChoiceSelect={onChoiceSelect} />
        ))}
      </AnimatePresence>

      <AnimatePresence>{(isTyping || isStreaming) && <TypingIndicator />}</AnimatePresence>

      <div ref={endRef} />
    </div>
  </div>
)
