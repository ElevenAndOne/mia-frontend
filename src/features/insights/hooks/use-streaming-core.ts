/**
 * Core streaming hook that provides SSE streaming with smooth character reveal.
 *
 * Tokens arrive from SSE in bursts (network batching, especially through ngrok).
 * To prevent jerky display, we decouple "received text" from "displayed text":
 *   - receivedRef: accumulates all text instantly as SSE events arrive
 *   - displayRef:  catches up to receivedRef at a steady pace via setInterval
 *
 * Uses setInterval(40ms) ≈ 25 ticks/sec (not requestAnimationFrame at 60fps)
 * because each tick triggers a React re-render + markdown re-parse.
 * 25/sec is perceptually smooth but causes 2.5x fewer re-renders than RAF.
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

// Reveal interval in ms — ~25 ticks/sec. Each tick triggers a React render,
// so we want this slow enough to avoid thrashing but fast enough to look smooth.
const REVEAL_INTERVAL_MS = 40

// Characters to reveal per tick. At 25 ticks/sec, 4 chars/tick ≈ 100 chars/sec.
const CHARS_PER_TICK = 4

export function useStreamingCore(config?: StreamingConfig): UseStreamingCoreReturn {
  const timeout = config?.timeout

  const [state, setState] = useState<StreamingState>({
    text: '',
    isStreaming: false,
    isComplete: false,
    error: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  // All text received from SSE (accumulates instantly)
  const receivedRef = useRef<string>('')
  // How many chars of receivedRef are currently displayed
  const displayIndexRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Whether the SSE stream has signaled done/error
  const streamDoneRef = useRef(false)

  const clearRevealInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      clearRevealInterval()
    }
  }, [clearRevealInterval])

  // Start the smooth reveal interval
  const startRevealLoop = useCallback(() => {
    // Don't start if already running
    if (intervalRef.current) return

    intervalRef.current = setInterval(() => {
      const target = receivedRef.current.length
      const current = displayIndexRef.current

      if (current < target) {
        // Fixed step per tick for consistent, smooth text flow
        displayIndexRef.current = Math.min(current + CHARS_PER_TICK, target)

        setState(prev => ({
          ...prev,
          text: receivedRef.current.slice(0, displayIndexRef.current)
        }))
      } else if (streamDoneRef.current) {
        // All text revealed and stream is done — signal completion
        clearRevealInterval()
        setState(prev => ({
          ...prev,
          text: receivedRef.current,
          isStreaming: false,
          isComplete: true
        }))
      }
      // If current === target but stream not done, interval keeps running
      // and will pick up new text as it arrives
    }, REVEAL_INTERVAL_MS)
  }, [clearRevealInterval])

  const reset = useCallback(() => {
    receivedRef.current = ''
    displayIndexRef.current = 0
    streamDoneRef.current = false

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    clearRevealInterval()

    setState({
      text: '',
      isStreaming: false,
      isComplete: false,
      error: null
    })
  }, [clearRevealInterval])

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Immediately show all received text
    clearRevealInterval()

    setState(prev => ({
      ...prev,
      text: receivedRef.current,
      isStreaming: false
    }))
  }, [clearRevealInterval])

  const processSSEStream = useCallback(async (
    url: string,
    options: RequestInit
  ) => {
    // Reset state
    receivedRef.current = ''
    displayIndexRef.current = 0
    streamDoneRef.current = false

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

      // Start the smooth reveal interval
      startRevealLoop()

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
                // Just accumulate — the reveal interval handles display pacing
                receivedRef.current += parsed.text
              } else if (parsed.done) {
                streamDoneRef.current = true
              } else if (parsed.error) {
                streamDoneRef.current = true
                clearRevealInterval()
                setState(prev => ({
                  ...prev,
                  text: receivedRef.current,
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
      streamDoneRef.current = true
      clearRevealInterval()

      if (error instanceof Error && error.name === 'AbortError') {
        if (timeout && receivedRef.current.length === 0) {
          setState(prev => ({
            ...prev,
            isStreaming: false,
            error: 'Request timed out. Please try again.'
          }))
        } else {
          setState(prev => ({
            ...prev,
            text: receivedRef.current,
            isStreaming: false
          }))
        }
      } else {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      }
    }
  }, [timeout, startRevealLoop, clearRevealInterval])

  return {
    state,
    stopStreaming,
    reset,
    processSSEStream
  }
}
