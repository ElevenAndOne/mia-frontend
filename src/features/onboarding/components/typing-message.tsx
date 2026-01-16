/**
 * TypingMessage - Displays a message with typing animation
 * Same speed as Grow insights (14ms/char = ~70 chars/sec)
 */
import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface TypingMessageProps {
  content: string
  choices?: { label: string; action: string }[]
  onChoiceSelect?: (action: string) => void
  onTypingComplete?: () => void
  skipAnimation?: boolean
}

const TypingMessage: React.FC<TypingMessageProps> = ({
  content,
  choices,
  onChoiceSelect,
  onTypingComplete,
  skipAnimation = false
}) => {
  const [displayedText, setDisplayedText] = useState(skipAnimation ? content : '')
  const [isTyping, setIsTyping] = useState(!skipAnimation && content.length > 0)
  const [showChoices, setShowChoices] = useState(skipAnimation)

  const pendingTextRef = useRef(skipAnimation ? '' : content)
  const displayedTextRef = useRef(skipAnimation ? content : '')
  const typingIntervalRef = useRef<number | null>(null)
  const hasCompletedRef = useRef(skipAnimation)

  // 14ms per character = ~70 chars/sec (same as Quick Insights)
  const TICK_INTERVAL = 14

  useEffect(() => {
    if (skipAnimation || hasCompletedRef.current) return

    typingIntervalRef.current = window.setInterval(() => {
      if (pendingTextRef.current.length > 0) {
        const char = pendingTextRef.current[0]
        pendingTextRef.current = pendingTextRef.current.slice(1)
        displayedTextRef.current += char
        setDisplayedText(displayedTextRef.current)
      } else {
        // Typing complete
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current)
          typingIntervalRef.current = null
        }
        setIsTyping(false)
        setShowChoices(true)
        hasCompletedRef.current = true

        if (onTypingComplete) {
          onTypingComplete()
        }
      }
    }, TICK_INTERVAL)

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
    }
  }, [skipAnimation, onTypingComplete])

  // Handle click to skip animation
  const handleClick = () => {
    if (isTyping && typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null

      // Show all remaining text immediately
      displayedTextRef.current += pendingTextRef.current
      pendingTextRef.current = ''
      setDisplayedText(displayedTextRef.current)
      setIsTyping(false)
      setShowChoices(true)
      hasCompletedRef.current = true

      if (onTypingComplete) {
        onTypingComplete()
      }
    }
  }

  // Don't render empty messages (buttons-only)
  const hasContent = content && content.trim().length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2"
      onClick={handleClick}
    >
      {/* Mia avatar - only show if there's content */}
      {hasContent && (
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">M</span>
        </div>
      )}

      <div className={`flex-1 space-y-2 ${!hasContent ? 'ml-10' : ''}`}>
        {/* Message bubble - only render if there's content */}
        {hasContent && (
          <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[85%] cursor-pointer">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {displayedText}
              {isTyping && <span className="animate-pulse ml-0.5">|</span>}
            </p>
          </div>
        )}

        {/* Choice buttons - only show after typing completes */}
        {showChoices && choices && choices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2"
          >
            {choices.map((choice, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onChoiceSelect) onChoiceSelect(choice.action)
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  index === 0
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {choice.label}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default TypingMessage
