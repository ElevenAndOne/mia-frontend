/**
 * Hook for streaming onboarding Grow summary with typing effect.
 * Simpler than useStreamingInsightsParsed - no parsing, just text streaming.
 * Uses same smooth typing speed (14ms/char = ~70 chars/sec).
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { createApiUrl } from '../utils/api'

interface StreamingState {
  text: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
}

interface UseOnboardingStreamingReturn {
  streamedText: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
  startStreaming: (sessionId: string, platforms?: string[]) => void
  stopStreaming: () => void
  reset: () => void
}

export function useOnboardingStreaming(): UseOnboardingStreamingReturn {
  const [state, setState] = useState<StreamingState>({
    text: '',
    isStreaming: false,
    isComplete: false,
    error: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  // Typing effect refs
  const pendingTextRef = useRef<string>('')
  const displayedTextRef = useRef<string>('')
  const typingIntervalRef = useRef<number | null>(null)
  const streamDoneRef = useRef<boolean>(false)

  // Same speed as Quick Insights: 14ms per char = ~70 chars/sec
  const TICK_INTERVAL = 14

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const startTypingEffect = useCallback(() => {
    if (typingIntervalRef.current) return

    typingIntervalRef.current = window.setInterval(() => {
      if (pendingTextRef.current.length > 0) {
        // Take one character from pending and add to displayed
        const char = pendingTextRef.current[0]
        pendingTextRef.current = pendingTextRef.current.slice(1)
        displayedTextRef.current += char

        setState(prev => ({
          ...prev,
          text: displayedTextRef.current
        }))
      } else if (streamDoneRef.current) {
        // All text displayed, stream complete
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current)
          typingIntervalRef.current = null
        }
        setState(prev => ({
          ...prev,
          isStreaming: false,
          isComplete: true
        }))
      }
    }, TICK_INTERVAL)
  }, [])

  const reset = useCallback(() => {
    pendingTextRef.current = ''
    displayedTextRef.current = ''
    streamDoneRef.current = false

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setState({
      text: '',
      isStreaming: false,
      isComplete: false,
      error: null
    })
  }, [])

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }

    // Show all remaining text immediately
    displayedTextRef.current += pendingTextRef.current
    pendingTextRef.current = ''

    setState(prev => ({
      ...prev,
      text: displayedTextRef.current,
      isStreaming: false
    }))
  }, [])

  const startStreaming = useCallback(async (
    sessionId: string,
    platforms?: string[]
  ) => {
    // Reset everything first
    pendingTextRef.current = ''
    displayedTextRef.current = ''
    streamDoneRef.current = false

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }

    setState({
      text: '',
      isStreaming: true,
      isComplete: false,
      error: null
    })

    abortControllerRef.current = new AbortController()

    // Timeout after 65s (slightly longer than backend's 60s timeout)
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort()
    }, 65000)

    startTypingEffect()

    try {
      const response = await fetch(
        createApiUrl('/api/onboarding/grow-summary/stream'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId
          },
          body: JSON.stringify({
            session_id: sessionId,
            platforms: platforms && platforms.length > 0 ? platforms : undefined
          }),
          signal: abortControllerRef.current.signal
        }
      )

      clearTimeout(timeoutId)  // Clear timeout on successful response

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          streamDoneRef.current = true
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const messages = buffer.split('\n\n')
        buffer = messages.pop() || ''

        for (const message of messages) {
          if (message.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(message.slice(6))
              if (parsed.text) {
                // Add text to pending queue
                pendingTextRef.current += parsed.text
              } else if (parsed.done) {
                streamDoneRef.current = true
              } else if (parsed.error) {
                // Handle error
                if (typingIntervalRef.current) {
                  clearInterval(typingIntervalRef.current)
                  typingIntervalRef.current = null
                }
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  error: parsed.error
                }))
                return
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      clearTimeout(timeoutId)  // Clear timeout on error

      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
        typingIntervalRef.current = null
      }

      if (error instanceof Error && error.name === 'AbortError') {
        // Could be user cancel OR timeout - check if we have any text
        if (displayedTextRef.current.length === 0) {
          // Timeout with no content - show error
          setState(prev => ({
            ...prev,
            isStreaming: false,
            error: 'Request timed out. Please try again.'
          }))
        } else {
          // User cancelled mid-stream - just stop
          setState(prev => ({ ...prev, isStreaming: false }))
        }
      } else {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Streaming error'
        }))
      }
    }
  }, [startTypingEffect])

  return {
    streamedText: state.text,
    isStreaming: state.isStreaming,
    isComplete: state.isComplete,
    error: state.error,
    startStreaming,
    stopStreaming,
    reset
  }
}
