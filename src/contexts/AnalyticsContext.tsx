import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { apiFetch } from '../utils/api'
import { useSession } from './SessionContext'

export interface AnalyticsData {
  header: {
    percentage: number
    description: string
    icon: string
  }
  insights: string[]
  roas: {
    percentage: number
    trend: string
    label: string
  }
  boxes: Array<{
    value: string
    label: string
    trend: string
    unit?: string
  }>
  prediction: {
    amount: string
    confidence: string
    description: string
  }
}

export type AnalyticsType = 'growth' | 'optimize' | 'protect'

interface AnalyticsCache {
  data: AnalyticsData
  timestamp: number
  dateRange: string
}

interface AnalyticsState {
  growth: AnalyticsCache | null
  optimize: AnalyticsCache | null
  protect: AnalyticsCache | null
  loading: {
    growth: boolean
    optimize: boolean
    protect: boolean
  }
  errors: {
    growth: string | null
    optimize: string | null
    protect: string | null
  }
}

interface AnalyticsContextType {
  state: AnalyticsState
  fetchAnalytics: (type: AnalyticsType, question: string, dateRange: string, forceRefresh?: boolean) => Promise<AnalyticsData | null>
  clearCache: (type?: AnalyticsType) => void
  isLoading: (type: AnalyticsType) => boolean
  getError: (type: AnalyticsType) => string | null
  getData: (type: AnalyticsType) => AnalyticsData | null
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useAnalytics = () => {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}

interface AnalyticsProviderProps {
  children: ReactNode
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const { selectedAccount, user } = useSession()
  const [state, setState] = useState<AnalyticsState>({
    growth: null,
    optimize: null,
    protect: null,
    loading: {
      growth: false,
      optimize: false,
      protect: false
    },
    errors: {
      growth: null,
      optimize: null,
      protect: null
    }
  })

  const getApiEndpoint = (type: AnalyticsType): string => {
    switch (type) {
      case 'growth':
        return '/api/growth-data'
      case 'optimize':
        return '/api/improve-data'
      case 'protect':
        return '/api/fix-data'
    }
  }

  const fetchAnalytics = useCallback(async (
    type: AnalyticsType,
    question: string,
    dateRange: string,
    forceRefresh = false
  ): Promise<AnalyticsData | null> => {
    // Check cache
    const cached = state[type]
    if (!forceRefresh && cached && cached.dateRange === dateRange) {
      const age = Date.now() - cached.timestamp
      if (age < CACHE_DURATION) {
        console.log(`[ANALYTICS] Using cached ${type} data`)
        return cached.data
      }
    }

    // Set loading state
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [type]: true },
      errors: { ...prev.errors, [type]: null }
    }))

    try {
      const endpoint = getApiEndpoint(type)
      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          context: type,
          user: user?.email || 'anonymous',
          selected_account: selectedAccount,
          user_id: user?.google_user_id || '',
          date_range: dateRange
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        const analyticsData = result.data as AnalyticsData

        // Update cache
        setState(prev => ({
          ...prev,
          [type]: {
            data: analyticsData,
            timestamp: Date.now(),
            dateRange
          },
          loading: { ...prev.loading, [type]: false },
          errors: { ...prev.errors, [type]: null }
        }))

        return analyticsData
      } else {
        throw new Error(result.error || 'Failed to fetch analytics data')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection error'
      
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, [type]: false },
        errors: { ...prev.errors, [type]: errorMessage }
      }))

      console.error(`[ANALYTICS] Error fetching ${type} data:`, error)
      return null
    }
  }, [state, selectedAccount, user])

  const clearCache = useCallback((type?: AnalyticsType) => {
    if (type) {
      setState(prev => ({
        ...prev,
        [type]: null
      }))
    } else {
      setState(prev => ({
        ...prev,
        growth: null,
        optimize: null,
        protect: null
      }))
    }
  }, [])

  const isLoading = useCallback((type: AnalyticsType): boolean => {
    return state.loading[type]
  }, [state.loading])

  const getError = useCallback((type: AnalyticsType): string | null => {
    return state.errors[type]
  }, [state.errors])

  const getData = useCallback((type: AnalyticsType): AnalyticsData | null => {
    return state[type]?.data || null
  }, [state])

  return (
    <AnalyticsContext.Provider
      value={{
        state,
        fetchAnalytics,
        clearCache,
        isLoading,
        getError,
        getData
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  )
}
