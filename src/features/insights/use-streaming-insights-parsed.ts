/**
 * Hook for streaming insights with real-time parsing into structured cards
 * Uses the same smooth typing effect as useStreamingInsights, but parses
 * the displayed text into structured cards on each render
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createApiUrl } from '../../shared/utils/api'

export interface ParsedInsight {
  title: string
  insight: string
  interpretation: string
  action: string
}

interface StreamingState {
  text: string // Raw displayed text (typed out smoothly)
  isStreaming: boolean
  isComplete: boolean
  error: string | null
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
function parseInsights(text: string): { insights: ParsedInsight[], currentIndex: number, currentSection: 'title' | 'insight' | 'interpretation' | 'action' | null } {
  const insights: ParsedInsight[] = []
  let currentIndex = -1
  let currentSection: 'title' | 'insight' | 'interpretation' | 'action' | null = null

  // Split by [Title]: to get each insight block
  const parts = text.split(MARKERS.TITLE)

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i]
    const insight: ParsedInsight = { title: '', insight: '', interpretation: '', action: '' }

    // Find positions of each marker in this block
    const insightPos = block.indexOf(MARKERS.INSIGHT)
    const interpPos = block.indexOf(MARKERS.INTERPRETATION)
    const actionPos = block.indexOf(MARKERS.ACTION)

    // Extract title (everything before first marker, or end of block)
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

    // Extract action section - also strip any trailing "## INSIGHT" headers
    if (actionPos >= 0) {
      let actionText = block.slice(actionPos + MARKERS.ACTION.length).trim()
      // Remove trailing markdown headers like "## INSIGHT 2", "---", etc.
      actionText = actionText.replace(/\n---[\s\S]*$/m, '').replace(/\n##\s*INSIGHT[\s\S]*$/im, '').trim()
      insight.action = actionText
    }

    insights.push(insight)
    currentIndex = insights.length - 1

    // Determine current section based on what's at the end
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
  const [state, setState] = useState<StreamingState>({
    text: '',
    isStreaming: false,
    isComplete: false,
    error: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  // Typing effect refs - exactly like useStreamingInsights
  const pendingTextRef = useRef<string>('')
  const displayedTextRef = useRef<string>('')
  const typingIntervalRef = useRef<number | null>(null)
  const streamDoneRef = useRef<boolean>(false)

  // Typing speed: 1 char every 14ms = ~70 chars/sec (the smooth speed)
  const CHARS_PER_TICK = 1
  const TICK_INTERVAL = 14

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
    }
  }, [])

  // Parse the displayed text into structured insights
  const parsed = useMemo(() => parseInsights(state.text), [state.text])

  const startTypingEffect = useCallback(() => {
    if (typingIntervalRef.current) return

    typingIntervalRef.current = window.setInterval(() => {
      if (pendingTextRef.current.length > 0) {
        const charsToAdd = pendingTextRef.current.slice(0, CHARS_PER_TICK)
        pendingTextRef.current = pendingTextRef.current.slice(CHARS_PER_TICK)
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

    abortControllerRef.current = new AbortController()
    startTypingEffect()

    try {
      const response = await fetch(
        createApiUrl(`/api/quick-insights/${insightType}/stream`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
                setState(prev => ({ ...prev, isStreaming: false, error: parsed.error }))
                return
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch (error) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
        typingIntervalRef.current = null
      }
      if (error instanceof Error && error.name === 'AbortError') {
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
