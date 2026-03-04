/**
 * Core streaming hook that provides SSE streaming.
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
  timeout?: number // Request timeout in ms (default: none)
}

export interface UseStreamingCoreReturn {
  state: StreamingState
  stopStreaming: () => void
  reset: () => void
  processSSEStream: (
    url: string,
    options: RequestInit
  ) => Promise<void>
}

export function useStreamingCore(config?: StreamingConfig): UseStreamingCoreReturn {
  const timeout = config?.timeout

  const [state, setState] = useState<StreamingState>({
    text: '',
    isStreaming: false,
    isComplete: false,
    error: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const textRef = useRef<string>('')
  const rafRef = useRef<number | null>(null)
  const pendingFlushRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const reset = useCallback(() => {
    textRef.current = ''

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

    setState(prev => ({
      ...prev,
      isStreaming: false
    }))
  }, [])

  const processSSEStream = useCallback(async (
    url: string,
    options: RequestInit
  ) => {
    // Reset state
    textRef.current = ''

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
          setState(prev => ({
            ...prev,
            isStreaming: false,
            isComplete: true
          }))
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
                // Accumulate text in ref, batch UI updates to animation frames
                // This prevents per-token re-renders (and re-parses) which cause jitter
                textRef.current += parsed.text
                if (!pendingFlushRef.current) {
                  pendingFlushRef.current = true
                  rafRef.current = requestAnimationFrame(() => {
                    pendingFlushRef.current = false
                    setState(prev => ({
                      ...prev,
                      text: textRef.current
                    }))
                  })
                }
              } else if (parsed.done) {
                // Flush any pending text before signaling completion
                if (rafRef.current) {
                  cancelAnimationFrame(rafRef.current)
                  pendingFlushRef.current = false
                }
                setState(prev => ({
                  ...prev,
                  text: textRef.current,
                  isStreaming: false,
                  isComplete: true
                }))
              } else if (parsed.error) {
                if (rafRef.current) {
                  cancelAnimationFrame(rafRef.current)
                  pendingFlushRef.current = false
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

      if (error instanceof Error && error.name === 'AbortError') {
        // Check if timeout vs user cancel
        if (timeout && textRef.current.length === 0) {
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
  }, [timeout])

  return {
    state,
    stopStreaming,
    reset,
    processSSEStream
  }
}
