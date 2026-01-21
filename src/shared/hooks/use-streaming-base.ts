/**
 * Base hook for SSE streaming with typing effect
 * Shared logic extracted from useStreamingInsightsParsed and useOnboardingStreaming
 */
import { useState, useCallback, useRef, useEffect } from 'react'

export interface StreamingState {
  text: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
}

export interface StreamingConfig {
  tickInterval?: number // ms between typing ticks (default: 14ms = ~70 chars/sec)
  charsPerTick?: number // characters per tick (default: 1)
  timeout?: number // request timeout in ms (default: none)
}

interface UseStreamingBaseReturn {
  state: StreamingState
  startStreaming: (
    url: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>
  ) => void
  stopStreaming: () => void
  reset: () => void
}

const DEFAULT_CONFIG: Required<StreamingConfig> = {
  tickInterval: 14,
  charsPerTick: 1,
  timeout: 0, // 0 = no timeout
}

export function useStreamingBase(config: StreamingConfig = {}): UseStreamingBaseReturn {
  const { tickInterval, charsPerTick, timeout } = { ...DEFAULT_CONFIG, ...config }

  const [state, setState] = useState<StreamingState>({
    text: '',
    isStreaming: false,
    isComplete: false,
    error: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const pendingTextRef = useRef<string>('')
  const displayedTextRef = useRef<string>('')
  const typingIntervalRef = useRef<number | null>(null)
  const streamDoneRef = useRef<boolean>(false)

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
        const charsToAdd = pendingTextRef.current.slice(0, charsPerTick)
        pendingTextRef.current = pendingTextRef.current.slice(charsPerTick)
        displayedTextRef.current += charsToAdd

        setState((prev) => ({
          ...prev,
          text: displayedTextRef.current,
        }))
      } else if (streamDoneRef.current) {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current)
          typingIntervalRef.current = null
        }
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          isComplete: true,
        }))
      }
    }, tickInterval)
  }, [tickInterval, charsPerTick])

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
      error: null,
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

    setState((prev) => ({
      ...prev,
      text: displayedTextRef.current,
      isStreaming: false,
    }))
  }, [])

  const startStreaming = useCallback(
    async (url: string, body: Record<string, unknown>, headers: Record<string, string> = {}) => {
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
        error: null,
      })

      abortControllerRef.current = new AbortController()

      // Optional timeout
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort()
        }, timeout)
      }

      startTypingEffect()

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
        })

        if (timeoutId) clearTimeout(timeoutId)

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
                  pendingTextRef.current += parsed.text
                } else if (parsed.done) {
                  streamDoneRef.current = true
                } else if (parsed.error) {
                  if (typingIntervalRef.current) {
                    clearInterval(typingIntervalRef.current)
                    typingIntervalRef.current = null
                  }
                  setState((prev) => ({
                    ...prev,
                    isStreaming: false,
                    error: parsed.error,
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
        if (timeoutId) clearTimeout(timeoutId)

        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current)
          typingIntervalRef.current = null
        }

        if (error instanceof Error && error.name === 'AbortError') {
          if (displayedTextRef.current.length === 0 && timeout > 0) {
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              error: 'Request timed out. Please try again.',
            }))
          } else {
            setState((prev) => ({ ...prev, isStreaming: false }))
          }
        } else {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: error instanceof Error ? error.message : 'Streaming error',
          }))
        }
      }
    },
    [startTypingEffect, timeout]
  )

  return {
    state,
    startStreaming,
    stopStreaming,
    reset,
  }
}
