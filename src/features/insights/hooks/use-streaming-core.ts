/**
 * Core streaming hook that provides SSE streaming with typing effect.
 * Used by useStreamingInsights, useStreamingInsightsParsed, and useOnboardingStreaming.
 */
import { useState, useCallback, useRef, useEffect } from 'react'

export interface StreamingState {
  text: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
}

export interface StreamingConfig {
  tickInterval?: number // Milliseconds between typing ticks (default: 14)
  charsPerTick?: number // Characters to add per tick (default: 1)
  timeout?: number // Request timeout in ms (default: none)
}

export interface StreamingRefs {
  pendingTextRef: React.MutableRefObject<string>
  displayedTextRef: React.MutableRefObject<string>
  streamDoneRef: React.MutableRefObject<boolean>
}

export interface UseStreamingCoreReturn {
  state: StreamingState
  refs: StreamingRefs
  startTypingEffect: () => void
  stopStreaming: () => void
  reset: () => void
  processSSEStream: (
    url: string,
    options: RequestInit
  ) => Promise<void>
}

const DEFAULT_TICK_INTERVAL = 14 // ~70 chars/sec
const DEFAULT_CHARS_PER_TICK = 1

export function useStreamingCore(config?: StreamingConfig): UseStreamingCoreReturn {
  const tickInterval = config?.tickInterval ?? DEFAULT_TICK_INTERVAL
  const charsPerTick = config?.charsPerTick ?? DEFAULT_CHARS_PER_TICK
  const timeout = config?.timeout

  const [state, setState] = useState<StreamingState>({
    text: '',
    isStreaming: false,
    isComplete: false,
    error: null
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

        setState(prev => ({
          ...prev,
          text: displayedTextRef.current
        }))
      } else if (streamDoneRef.current) {
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

  const processSSEStream = useCallback(async (
    url: string,
    options: RequestInit
  ) => {
    // Reset state
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

    // Optional timeout
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    if (timeout) {
      timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort()
      }, timeout)
    }

    startTypingEffect()

    try {
      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal
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
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  error: parsed.error
                }))
                return
              }
            } catch {
              // Ignore JSON parse errors
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
        // Check if timeout vs user cancel
        if (timeout && displayedTextRef.current.length === 0) {
          setState(prev => ({
            ...prev,
            isStreaming: false,
            error: 'Request timed out. Please try again.'
          }))
        } else {
          setState(prev => ({ ...prev, isStreaming: false }))
        }
      } else {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      }
    }
  }, [startTypingEffect, timeout])

  return {
    state,
    refs: {
      pendingTextRef,
      displayedTextRef,
      streamDoneRef
    },
    startTypingEffect,
    stopStreaming,
    reset,
    processSSEStream
  }
}
