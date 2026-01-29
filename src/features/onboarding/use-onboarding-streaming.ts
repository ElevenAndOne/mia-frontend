/**
 * Hook for streaming onboarding Grow summary with typing effect.
 * Simpler than useStreamingInsightsParsed - no parsing, just text streaming.
 */
import { useCallback } from 'react'
import { useStreamingCore } from '../insights/hooks/use-streaming-core'
import { createApiUrl } from '../../utils/api'

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
  const {
    state,
    processSSEStream,
    stopStreaming,
    reset
  } = useStreamingCore({ tickInterval: 14, timeout: 65000 })

  const startStreaming = useCallback(async (
    sessionId: string,
    platforms?: string[]
  ) => {
    await processSSEStream(
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
        })
      }
    )
  }, [processSSEStream])

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
