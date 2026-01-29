/**
 * Hook for streaming insights from Claude API via SSE
 * Provides real-time text streaming with smooth typing effect
 */
import { useCallback } from 'react'
import { useStreamingCore } from './use-streaming-core'
import { createApiUrl } from '../../../utils/api'

interface UseStreamingInsightsReturn {
  text: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
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
  const {
    state,
    processSSEStream,
    stopStreaming,
    reset
  } = useStreamingCore({ tickInterval: 15 })

  const startStreaming = useCallback(async (
    insightType: 'grow' | 'optimize' | 'protect',
    sessionId: string,
    dateRange: string = '30_days',
    platforms?: string[]
  ) => {
    await processSSEStream(
      createApiUrl(`/api/quick-insights/${insightType}/stream`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          date_range: dateRange,
          platforms: platforms && platforms.length > 0 ? platforms : undefined
        })
      }
    )
  }, [processSSEStream])

  return {
    ...state,
    startStreaming,
    stopStreaming,
    reset
  }
}
