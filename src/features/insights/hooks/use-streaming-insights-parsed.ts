/**
 * Hook for streaming insights with real-time parsing into structured cards
 * Uses the same smooth typing effect, but parses the displayed text into structured cards
 */
import { useCallback, useEffect, useMemo } from 'react'
import { useStreamingCore } from './use-streaming-core'
import { createApiUrl } from '../../../utils/api'

export interface ParsedInsight {
  title: string
  insight: string
  interpretation: string
  action: string
}

interface UseStreamingInsightsParsedReturn {
  insights: ParsedInsight[]
  currentInsightIndex: number
  currentSection: 'title' | 'insight' | 'interpretation' | 'action' | null
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

// Markers we look for in the stream
const MARKERS = {
  TITLE: '[Title]:',
  INSIGHT: '[Insight]:',
  INTERPRETATION: '[Interpretation]:',
  ACTION: '[Action]:'
}

// Parse displayed text into structured insights
function parseInsights(text: string): {
  insights: ParsedInsight[]
  currentIndex: number
  currentSection: 'title' | 'insight' | 'interpretation' | 'action' | null
} {
  const insights: ParsedInsight[] = []
  let currentIndex = -1
  let currentSection: 'title' | 'insight' | 'interpretation' | 'action' | null = null

  const parts = text.split(MARKERS.TITLE)

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i]
    const insight: ParsedInsight = { title: '', insight: '', interpretation: '', action: '' }

    const insightPos = block.indexOf(MARKERS.INSIGHT)
    const interpPos = block.indexOf(MARKERS.INTERPRETATION)
    const actionPos = block.indexOf(MARKERS.ACTION)

    // Extract title
    const firstMarkerPos = Math.min(
      insightPos >= 0 ? insightPos : Infinity,
      interpPos >= 0 ? interpPos : Infinity,
      actionPos >= 0 ? actionPos : Infinity
    )
    insight.title = (firstMarkerPos === Infinity ? block : block.slice(0, firstMarkerPos)).trim()

    // Extract insight section
    if (insightPos >= 0) {
      const afterInsight = block.slice(insightPos + MARKERS.INSIGHT.length)
      const nextMarkerPos = Math.min(
        afterInsight.indexOf(MARKERS.INTERPRETATION) >= 0 ? afterInsight.indexOf(MARKERS.INTERPRETATION) : Infinity,
        afterInsight.indexOf(MARKERS.ACTION) >= 0 ? afterInsight.indexOf(MARKERS.ACTION) : Infinity
      )
      insight.insight = (nextMarkerPos === Infinity ? afterInsight : afterInsight.slice(0, nextMarkerPos)).trim()
    }

    // Extract interpretation section
    if (interpPos >= 0) {
      const afterInterp = block.slice(interpPos + MARKERS.INTERPRETATION.length)
      const nextMarkerPos = afterInterp.indexOf(MARKERS.ACTION)
      insight.interpretation = (nextMarkerPos < 0 ? afterInterp : afterInterp.slice(0, nextMarkerPos)).trim()
    }

    // Extract action section
    if (actionPos >= 0) {
      let actionText = block.slice(actionPos + MARKERS.ACTION.length).trim()
      actionText = actionText.replace(/\n---[\s\S]*$/m, '').replace(/\n##\s*INSIGHT[\s\S]*$/im, '').trim()
      insight.action = actionText
    }

    insights.push(insight)
    currentIndex = insights.length - 1

    if (actionPos >= 0) {
      currentSection = 'action'
    } else if (interpPos >= 0) {
      currentSection = 'interpretation'
    } else if (insightPos >= 0) {
      currentSection = 'insight'
    } else {
      currentSection = 'title'
    }
  }

  return { insights, currentIndex, currentSection }
}

export function useStreamingInsightsParsed(): UseStreamingInsightsParsedReturn {
  const {
    state,
    processSSEStream,
    stopStreaming,
    reset
  } = useStreamingCore()

  const parsed = useMemo(() => parseInsights(state.text), [state.text])

  useEffect(() => {
    if (state.isComplete && parsed.insights.length > 0) {
      console.log('Insights fully streamed:', parsed.insights)
    }
  }, [state.isComplete, parsed.insights])

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
    insights: parsed.insights,
    currentInsightIndex: parsed.currentIndex,
    currentSection: parsed.currentSection,
    isStreaming: state.isStreaming,
    isComplete: state.isComplete,
    error: state.error,
    startStreaming,
    stopStreaming,
    reset
  }
}
