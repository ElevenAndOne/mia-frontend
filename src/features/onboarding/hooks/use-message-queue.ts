/**
 * useMessageQueue - Message queue system for OnboardingChatV2
 *
 * Manages the message queue, typing states, and step tracking for the onboarding flow.
 * Messages are queued and displayed one at a time with typing indicators between them.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { BronzeFact } from '../../../contexts/onboarding-context'

// Message types for the chat
export type MessageType = 'mia' | 'user' | 'bronze-card' | 'explainer-box' | 'insight-card' | 'choice-buttons'

export interface ChatMessage {
  id: string
  type: MessageType
  content?: string
  bronzeFact?: BronzeFact
  explainerType?: 'grow' | 'optimise' | 'protect'
  insightData?: InsightData
  choices?: { label: string; action: string; variant?: 'primary' | 'secondary' }[]
}

export interface InsightData {
  type: 'grow' | 'optimise' | 'protect'
  platform: string
  title: string
  metrics: { value: string; label: string; badge?: string }[]
  description: string
}

// Generate unique ID for messages
const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const useMessageQueue = () => {
  // Message state
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([])
  const [messageQueue, setMessageQueue] = useState<Omit<ChatMessage, 'id'>[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Refs
  const processingQueue = useRef(false)

  // Process message queue
  useEffect(() => {
    if (messageQueue.length === 0 || isTyping || processingQueue.current) return

    processingQueue.current = true
    const nextMessage = messageQueue[0]

    // Show typing indicator
    setIsTyping(true)

    // Determine delay based on message type - 2 seconds for all messages for natural pacing
    const delay = nextMessage.type === 'explainer-box' ? 2500 : 2000

    const timer = setTimeout(() => {
      // Add message to displayed
      setDisplayedMessages(prev => [...prev, { ...nextMessage, id: generateId() }])
      // Remove from queue
      setMessageQueue(prev => prev.slice(1))
      // Hide typing
      setIsTyping(false)
      processingQueue.current = false

      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [messageQueue, isTyping])

  // Queue messages helper
  const enqueueMessages = useCallback((messages: Omit<ChatMessage, 'id'>[]) => {
    setMessageQueue(prev => [...prev, ...messages])
  }, [])

  // Add single message immediately (no queue)
  const addImmediateMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    setDisplayedMessages(prev => [...prev, { ...message, id: generateId() }])
  }, [])

  // Clear all messages
  const clearMessages = useCallback(() => {
    setDisplayedMessages([])
    setMessageQueue([])
    setIsTyping(false)
  }, [])

  // Update current step
  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }, [])

  // Skip to end (useful for testing)
  const skipToEnd = useCallback(() => {
    setMessageQueue([])
    setIsTyping(false)
  }, [])

  return {
    messages: displayedMessages,
    isTyping,
    currentStep,
    enqueueMessages,
    addImmediateMessage,
    clearMessages,
    nextStep,
    skipToEnd,
    setCurrentStep,
  }
}
