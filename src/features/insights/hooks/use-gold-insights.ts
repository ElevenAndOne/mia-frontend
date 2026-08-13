import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchGoldInsights,
  triggerGoldRefresh,
  type GoldInsightsResponse,
} from '../services/gold-service'

export const useGoldInsights = (sessionId: string | null) => {
  const [data, setData] = useState<GoldInsightsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Foreground fetch: drives the spinner + the visible error box. Used for the
  // initial load and explicit "Try Again". A failure here surfaces to the user.
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!sessionId) {
        throw new Error('No session found. Please log in again.')
      }

      const result = await fetchGoldInsights(sessionId)
      setData(result)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // Background poll: never touches isLoading/error and keeps the last-good
  // report on failure. A transient network blip during a 30s poll must NOT
  // wipe an already-rendered report or flash a scary error — the job is still
  // running server-side and the next poll recovers on its own.
  const pollOnce = useCallback(async (): Promise<GoldInsightsResponse | null> => {
    if (!sessionId) return null
    try {
      const result = await fetchGoldInsights(sessionId)
      setData(result)
      return result
    } catch {
      return null
    }
  }, [sessionId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // The structured report is built server-side in the background on first
  // fetch; poll briefly for it, but capped so a permanently-failing build
  // doesn't poll (and re-trigger) forever.
  const reportPollsRef = useRef(0)

  // Poll every 30s while a run is in flight ('triggered', 'running', a
  // background re-analysis behind an already-completed report, or a completed
  // report whose structured rendition is still being built)
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    const awaitingReport = (d: GoldInsightsResponse | null) =>
      d?.status === 'completed' &&
      d.summary != null &&
      d.report == null &&
      reportPollsRef.current < 5

    const inFlight = (d: GoldInsightsResponse | null) =>
      d?.status === 'triggered' ||
      d?.status === 'running' ||
      d?.refresh_in_progress === true ||
      awaitingReport(d)

    if (inFlight(data)) {
      pollRef.current = setInterval(async () => {
        const result = await pollOnce()
        // On a failed poll (result null) keep polling — the run is still going.
        if (result) {
          if (result.report != null) {
            reportPollsRef.current = 0
          } else if (awaitingReport(result)) {
            reportPollsRef.current += 1
          }
          if (!inFlight(result)) {
            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }
          }
        }
      }, 30000)
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [data?.status, data?.refresh_in_progress, data?.report, pollOnce])

  const [isRefreshing, setIsRefreshing] = useState(false)

  const triggerRefresh = useCallback(async () => {
    if (!sessionId) return
    try {
      setIsRefreshing(true)
      setError(null)
      const result = await triggerGoldRefresh(sessionId)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger refresh')
    } finally {
      setIsRefreshing(false)
    }
  }, [sessionId])

  return { data, isLoading, error, refresh, triggerRefresh, isRefreshing }
}
