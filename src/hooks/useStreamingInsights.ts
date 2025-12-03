/**
 * Hook for streaming insights from Claude API via SSE
 * Provides real-time text streaming for Grow, Optimize, Protect insights
 */
import { useState, useCallback, useRef } from 'react'
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

  const reset = useCallback(() => {
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
    setState(prev => ({ ...prev, isStreaming: false }))
  }, [])

  const startStreaming = useCallback(async (
    insightType: 'grow' | 'optimize' | 'protect',
    sessionId: string,
    dateRange: string = '30_days',
    platforms?: string[]
  ) => {
    // Reset state
    setState({
      text: '',
      isStreaming: true,
      isComplete: false,
      error: null
    })

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

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
          setState(prev => ({ ...prev, isStreaming: false, isComplete: true }))
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
                // Append text chunk
                setState(prev => ({
                  ...prev,
                  text: prev.text + parsed.text
                }))
              } else if (parsed.done) {
                // Stream complete
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  isComplete: true
                }))
              } else if (parsed.error) {
                // Error received
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  error: parsed.error
                }))
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
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
  }, [])

  return {
    ...state,
    startStreaming,
    stopStreaming,
    reset
  }
}
