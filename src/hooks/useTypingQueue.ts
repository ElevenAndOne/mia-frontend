/**
 * Typing Queue Hook - Makes all messages appear with typing effect
 *
 * Same typing speed as Grow insights (14ms/char = ~70 chars/sec)
 * Messages queue up and type one at a time for natural conversation feel.
 */
import { useState, useCallback, useRef, useEffect } from 'react'

interface QueuedMessage {
  id: string
  content: string
  choices?: { label: string; action: string }[]
  onComplete?: () => void
}

interface TypingState {
  currentMessage: QueuedMessage | null
  displayedText: string
  isTyping: boolean
  completedMessages: QueuedMessage[]
}

interface UseTypingQueueReturn {
  // Current typing state
  displayedText: string
  isTyping: boolean
  currentMessageId: string | null
  currentChoices: { label: string; action: string }[] | undefined

  // Completed messages (fully typed)
  completedMessages: QueuedMessage[]

  // Actions
  queueMessage: (message: QueuedMessage) => void
  skipTyping: () => void
  reset: () => void
}

export function useTypingQueue(): UseTypingQueueReturn {
  const [state, setState] = useState<TypingState>({
    currentMessage: null,
    displayedText: '',
    isTyping: false,
    completedMessages: []
  })

  // Queue of messages waiting to be typed
  const messageQueueRef = useRef<QueuedMessage[]>([])

  // Typing effect refs
  const pendingTextRef = useRef<string>('')
  const displayedTextRef = useRef<string>('')
  const typingIntervalRef = useRef<number | null>(null)
  const currentMessageRef = useRef<QueuedMessage | null>(null)

  // Same speed as Quick Insights: 14ms per char = ~70 chars/sec
  const TICK_INTERVAL = 14

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
    }
  }, [])

  // Process next message in queue
  const processNextMessage = useCallback(() => {
    if (messageQueueRef.current.length === 0) {
      setState(prev => ({
        ...prev,
        currentMessage: null,
        isTyping: false
      }))
      return
    }

    const nextMessage = messageQueueRef.current.shift()!
    currentMessageRef.current = nextMessage
    pendingTextRef.current = nextMessage.content
    displayedTextRef.current = ''

    setState(prev => ({
      ...prev,
      currentMessage: nextMessage,
      displayedText: '',
      isTyping: true
    }))

    // Start typing interval
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
    }

    typingIntervalRef.current = window.setInterval(() => {
      if (pendingTextRef.current.length > 0) {
        // Take one character from pending and add to displayed
        const char = pendingTextRef.current[0]
        pendingTextRef.current = pendingTextRef.current.slice(1)
        displayedTextRef.current += char

        setState(prev => ({
          ...prev,
          displayedText: displayedTextRef.current
        }))
      } else {
        // Message complete
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current)
          typingIntervalRef.current = null
        }

        const completedMessage = currentMessageRef.current
        if (completedMessage) {
          // Call onComplete callback if provided
          if (completedMessage.onComplete) {
            completedMessage.onComplete()
          }

          setState(prev => ({
            ...prev,
            completedMessages: [...prev.completedMessages, completedMessage],
            isTyping: false
          }))
        }

        // Process next message after a short delay
        setTimeout(() => {
          processNextMessage()
        }, 100)
      }
    }, TICK_INTERVAL)
  }, [])

  // Queue a new message
  const queueMessage = useCallback((message: QueuedMessage) => {
    messageQueueRef.current.push(message)

    // If not currently typing, start processing
    if (!currentMessageRef.current && !state.isTyping) {
      processNextMessage()
    }
  }, [processNextMessage, state.isTyping])

  // Skip current typing animation (show remaining text immediately)
  const skipTyping = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }

    // Show all remaining text
    displayedTextRef.current += pendingTextRef.current
    pendingTextRef.current = ''

    const completedMessage = currentMessageRef.current
    if (completedMessage) {
      if (completedMessage.onComplete) {
        completedMessage.onComplete()
      }

      setState(prev => ({
        ...prev,
        displayedText: displayedTextRef.current,
        completedMessages: [...prev.completedMessages, completedMessage],
        currentMessage: null,
        isTyping: false
      }))
    }

    // Process next message
    setTimeout(() => {
      processNextMessage()
    }, 100)
  }, [processNextMessage])

  // Reset everything
  const reset = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }

    messageQueueRef.current = []
    pendingTextRef.current = ''
    displayedTextRef.current = ''
    currentMessageRef.current = null

    setState({
      currentMessage: null,
      displayedText: '',
      isTyping: false,
      completedMessages: []
    })
  }, [])

  return {
    displayedText: state.displayedText,
    isTyping: state.isTyping,
    currentMessageId: state.currentMessage?.id || null,
    currentChoices: state.currentMessage?.choices,
    completedMessages: state.completedMessages,
    queueMessage,
    skipTyping,
    reset
  }
}