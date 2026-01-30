import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage, ChatMessageInput } from '../onboarding-chat-types'

interface MessageQueueState {
  displayedMessages: ChatMessage[]
  isTyping: boolean
  queueMessages: (messages: ChatMessageInput[]) => void
  addImmediateMessage: (message: ChatMessageInput) => void
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

  useEffect(() => {
    if (messageQueue.length === 0 || isTyping || processingQueue.current) return

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
      setIsTyping(false)
    }
  }, [isTyping, messageQueue])

  return {
    displayedMessages,
    isTyping,
    queueMessages,
    addImmediateMessage
  }
}
