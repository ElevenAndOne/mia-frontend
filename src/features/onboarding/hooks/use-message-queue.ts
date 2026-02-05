import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage, ChatMessageInput } from '../onboarding-chat-types'

const MESSAGES_STORAGE_KEY = 'mia_onboarding_messages'

interface MessageQueueState {
  displayedMessages: ChatMessage[]
  isTyping: boolean
  queueMessages: (messages: ChatMessageInput[]) => void
  addImmediateMessage: (message: ChatMessageInput) => void
  persistMessages: () => void
  restoreMessages: () => boolean
  clearPersistedMessages: () => void
}

export const useMessageQueue = (): MessageQueueState => {
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([])
  const [messageQueue, setMessageQueue] = useState<ChatMessageInput[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const processingQueue = useRef(false)
  const idRef = useRef(0)

  const generateId = () => `msg_${Date.now()}_${idRef.current++}`

  const queueMessages = useCallback((messages: ChatMessageInput[]) => {
    setMessageQueue((prev) => [...prev, ...messages])
  }, [])

  const addImmediateMessage = useCallback((message: ChatMessageInput) => {
    setDisplayedMessages((prev) => [...prev, { ...message, id: generateId() }])
  }, [])

  // Persist current messages to localStorage (call before OAuth redirect)
  const persistMessages = useCallback(() => {
    try {
      // Filter out explainer boxes as they don't serialize well and will be re-shown if needed
      const messagesToPersist = displayedMessages.filter(m => m.type !== 'explainer-box')
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messagesToPersist))
      console.log('[MESSAGE-QUEUE] Persisted', messagesToPersist.length, 'messages')
    } catch (e) {
      console.error('[MESSAGE-QUEUE] Failed to persist messages:', e)
    }
  }, [displayedMessages])

  // Restore messages from localStorage (call when returning from OAuth)
  const restoreMessages = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(MESSAGES_STORAGE_KEY)
      if (stored) {
        const messages = JSON.parse(stored) as ChatMessage[]
        setDisplayedMessages(messages)
        console.log('[MESSAGE-QUEUE] Restored', messages.length, 'messages')
        return true
      }
    } catch (e) {
      console.error('[MESSAGE-QUEUE] Failed to restore messages:', e)
    }
    return false
  }, [])

  // Clear persisted messages (call after onboarding completes)
  const clearPersistedMessages = useCallback(() => {
    localStorage.removeItem(MESSAGES_STORAGE_KEY)
  }, [])

  useEffect(() => {
    if (messageQueue.length === 0 || processingQueue.current) return

    processingQueue.current = true
    const nextMessage = messageQueue[0]
    setIsTyping(true)

    const delay = nextMessage.type === 'explainer-box' ? 2500 : 2000
    const timeoutId = window.setTimeout(() => {
      setDisplayedMessages((prev) => [...prev, { ...nextMessage, id: generateId() }])
      setMessageQueue((prev) => prev.slice(1))
      setIsTyping(false)
      processingQueue.current = false

      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
      processingQueue.current = false
    }
  }, [messageQueue])

  return {
    displayedMessages,
    isTyping,
    queueMessages,
    addImmediateMessage,
    persistMessages,
    restoreMessages,
    clearPersistedMessages
  }
}
