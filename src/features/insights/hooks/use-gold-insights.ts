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

  useEffect(() => {
    refresh()
  }, [refresh])

  // Poll every 30s while a run is in flight ('triggered', 'running', or a
  // background re-analysis behind an already-completed report)
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    const inFlight = (d: GoldInsightsResponse | null) =>
      d?.status === 'triggered' || d?.status === 'running' || d?.refresh_in_progress === true

    if (inFlight(data)) {
      pollRef.current = setInterval(async () => {
        const result = await refresh()
        if (result && !inFlight(result)) {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
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
  }, [data?.status, data?.refresh_in_progress, refresh])

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
