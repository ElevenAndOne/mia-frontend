import { useCallback, useEffect, useState } from 'react'
import { useMiaClient } from '../../../sdk'

export const useSummaryInsights = (sessionId: string | null, dateRange: string) => {
  const mia = useMiaClient()
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!sessionId) {
        throw new Error('No session found. Please log in again.')
      }

      const result = await mia.insights.getSummary(dateRange)
      if (result.success) {
        setSummary(result.summary || null)
      } else {
        throw new Error('Failed to fetch summary')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, dateRange, mia])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { summary, isLoading, error, refresh }
}
