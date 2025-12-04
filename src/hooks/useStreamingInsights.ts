/**
 * Hook for streaming insights from Claude API via SSE
 * Provides real-time text streaming with smooth typing effect
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { createApiUrl } from '../utils/api'

interface StreamingState {
  text: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
}

interface UseStreamingInsightsReturn extends StreamingState {
  startStreaming: (
    insightType: 'grow' | 'optimize' | 'protect',
    sessionId: string,
    dateRange?: string,
    platforms?: string[]
  ) => void
  stopStreaming: () => void
  reset: () => void
}

export function useStreamingInsights(): UseStreamingInsightsReturn {
  const [state, setState] = useState<StreamingState>({
    text: '',
    isStreaming: false,
    isComplete: false,
    error: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  // Typing effect refs
  const pendingTextRef = useRef<string>('') // Text waiting to be displayed
  const displayedTextRef = useRef<string>('') // Text already shown
  const typingIntervalRef = useRef<number | null>(null)
  const streamDoneRef = useRef<boolean>(false)

  // Typing speed: characters per interval (slower = more readable)
  const CHARS_PER_TICK = 1  // Characters to add each tick
  const TICK_INTERVAL = 15  // Milliseconds between ticks (~65 chars/sec)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
    }
  }, [])

  // Start the typing animation
  const startTypingEffect = useCallback(() => {
    if (typingIntervalRef.current) return // Already running

    typingIntervalRef.current = window.setInterval(() => {
      if (pendingTextRef.current.length > 0) {
        // Take next chunk of characters from pending
        const charsToAdd = pendingTextRef.current.slice(0, CHARS_PER_TICK)
        pendingTextRef.current = pendingTextRef.current.slice(CHARS_PER_TICK)
        displayedTextRef.current += charsToAdd

        setState(prev => ({
          ...prev,
          text: displayedTextRef.current
        }))
      } else if (streamDoneRef.current) {
        // No more pending text and stream is done - stop typing
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
      // If pending is empty but stream not done, keep interval running
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
    insightType: 'grow' | 'optimize' | 'protect',
    sessionId: string,
    dateRange: string = '30_days',
    platforms?: string[]
  ) => {
    // Reset everything
    pendingTextRef.current = ''
    displayedTextRef.current = ''
    streamDoneRef.current = false

    setState({
      text: '',
      isStreaming: true,
      isComplete: false,
      error: null
    })

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    // Start the typing effect
    startTypingEffect()

    try {
      const response = await fetch(
        createApiUrl(`/api/quick-insights/${insightType}/stream`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            date_range: dateRange,
            platforms: platforms && platforms.length > 0 ? platforms : undefined
          }),
          signal: abortControllerRef.current.signal
        }
      )

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

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages (each ends with \n\n)
        const messages = buffer.split('\n\n')
        buffer = messages.pop() || '' // Keep incomplete message in buffer

        for (const message of messages) {
          if (message.startsWith('data: ')) {
            const data = message.slice(6) // Remove "data: " prefix
            try {
              const parsed = JSON.parse(data)

              if (parsed.text) {
                // Add to pending queue (typing effect will display it)
                pendingTextRef.current += parsed.text
              } else if (parsed.done) {
                streamDoneRef.current = true
              } else if (parsed.error) {
                // Error - stop everything
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
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
        typingIntervalRef.current = null
      }
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled - not an error
        setState(prev => ({ ...prev, isStreaming: false }))
      } else {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      }
    }
  }, [startTypingEffect])

  return {
    ...state,
    startStreaming,
    stopStreaming,
    reset
  }
}
