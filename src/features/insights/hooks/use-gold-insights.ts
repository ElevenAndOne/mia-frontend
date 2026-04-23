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

  // Poll every 30s while status is 'triggered' or 'running'
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    if (data?.status === 'triggered' || data?.status === 'running') {
      pollRef.current = setInterval(async () => {
        const result = await refresh()
        if (result && result.status !== 'triggered' && result.status !== 'running') {
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
  }, [data?.status, refresh])

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
