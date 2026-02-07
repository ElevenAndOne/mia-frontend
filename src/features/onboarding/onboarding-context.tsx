/**
 * Onboarding Context - State management for Mia-guided onboarding flow
 *
 * Manages:
 * - Current onboarding step (0-5)
 * - Connected platforms tracking
 * - Background task status (Grow insights)
 * - Bronze fact display state
 * - Skip/complete actions
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useMiaClient, isMiaSDKError, type BronzeFact as SDKBronzeFact } from '../../sdk'
import { useSession } from '../../contexts/session-context'

// Onboarding steps
export const ONBOARDING_STEPS = {
  NOT_STARTED: 0,
  FIRST_PLATFORM_CONNECTED: 1,
  BRONZE_FACT_SHOWN: 2,
  ASKED_SECOND_PLATFORM: 3,
  SECOND_PLATFORM_CONNECTED: 4,
  COMPLETED: 5,
} as const

export interface BronzeFact {
  platform: string
  headline: string
  detail?: string
  metric_value?: number
  metric_name?: string
}

export interface OnboardingState {
  // Onboarding progress
  step: number
  completed: boolean
  skipped: boolean

  // Platforms
  platformsConnected: string[]
  platformCount: number
  fullAccess: boolean  // true when 2+ platforms connected

  // Bronze data
  bronzeReady: boolean
  currentBronzeFact: BronzeFact | null

  // Background task
  growTaskId: string | null
  growInsightsReady: boolean
  growInsightsProgress: number
  growInsightsSummary: string | null  // The actual summary result

  // UI state
  isLoading: boolean
  error: string | null
}

export interface OnboardingActions {
  // Fetch current status from backend
  loadOnboardingStatus: () => Promise<string | null>

  // Step progression
  advanceStep: () => Promise<void>
  updateStep: (step: number) => Promise<void>

  // Bronze facts
  fetchBronzeHighlight: (platform?: string) => Promise<BronzeFact | null>
  fetchBronzeFollowup: (platform?: string) => Promise<BronzeFact | null>

  // Background tasks
  startGrowInsightsAsync: () => Promise<string | null>
  checkGrowInsightsStatus: (taskIdOverride?: string) => Promise<boolean>

  // Completion
  completeOnboarding: () => Promise<void>
  skipOnboarding: () => Promise<void>

  // Available platforms
  getAvailablePlatforms: () => Promise<{ id: string; name: string; connected: boolean }[]>

  // Clear state
  reset: () => void
}

type OnboardingContextType = OnboardingState & OnboardingActions

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components -- useOnboarding hook must be co-located with OnboardingContext for proper context usage
export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

interface OnboardingProviderProps {
  children: ReactNode
}

// Map SDK BronzeFact to local format (snake_case for backwards compatibility)
const mapBronzeFact = (fact: SDKBronzeFact): BronzeFact => ({
  platform: fact.platform,
  headline: fact.headline,
  detail: fact.detail,
  metric_value: fact.metricValue,
  metric_name: fact.metricName,
})

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { sessionId, selectedAccount, refreshWorkspaces, checkExistingAuth } = useSession()
  const mia = useMiaClient()

  const [state, setState] = useState<OnboardingState>({
    step: 0,
    completed: false,
    skipped: false,
    platformsConnected: [],
    platformCount: 0,
    fullAccess: false,
    bronzeReady: false,
    currentBronzeFact: null,
    growTaskId: null,
    growInsightsReady: false,
    growInsightsProgress: 0,
    growInsightsSummary: null,
    isLoading: false,
    error: null,
  })

  // OPTIMIZATION: Deduplication refs for loadOnboardingStatus
  const isLoadingRef = React.useRef(false)
  const lastLoadTimeRef = React.useRef(0)

  // Load onboarding status when session/account changes
  useEffect(() => {
    if (sessionId && selectedAccount) {
      loadOnboardingStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, selectedAccount?.id])

  const loadOnboardingStatus = useCallback(async (forceRefresh = false): Promise<string | null> => {
    if (!sessionId) return null

    // OPTIMIZATION: Skip if already loading or loaded recently (within 2 seconds)
    const now = Date.now()
    if (!forceRefresh) {
      if (isLoadingRef.current) {
        console.log('[ONBOARDING] Skipping duplicate load (already in progress)')
        return state.growTaskId
      }
      if (now - lastLoadTimeRef.current < 2000) {
        console.log('[ONBOARDING] Skipping duplicate load (loaded recently)')
        return state.growTaskId
      }
    }

    isLoadingRef.current = true
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const data = await mia.onboarding.getStatus()
      console.log('[ONBOARDING] Status loaded:', {
        growTaskId: data.growTaskId,
        step: data.step,
        bronzeReady: data.bronzeReady
      })
      setState(prev => ({
        ...prev,
        step: data.step || 0,
        completed: data.completed || false,
        platformsConnected: data.platformsConnected || [],
        platformCount: data.platformCount || 0,
        fullAccess: data.fullAccess || false,
        bronzeReady: data.bronzeReady || false,
        growTaskId: data.growTaskId || null,
        isLoading: false,
      }))
      // Update deduplication tracking
      lastLoadTimeRef.current = Date.now()
      // Return the task ID directly so callers don't have to wait for state
      return data.growTaskId || null
    } catch (err) {
      console.error('[ONBOARDING] Status load error:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: isMiaSDKError(err) ? err.message : 'Failed to connect to server'
      }))
    } finally {
      // Always clear the loading ref so future loads can proceed
      isLoadingRef.current = false
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, mia])

  const advanceStep = useCallback(async () => {
    if (!sessionId) return

    // OPTIMIZATION: Update local state immediately (optimistic update)
    setState(prev => ({
      ...prev,
      step: Math.min(prev.step + 1, 5),
      completed: prev.step + 1 >= 5,
    }))

    // Sync to server in background (fire-and-forget)
    mia.onboarding.advanceStep().catch(err => {
      console.error('[ONBOARDING] Advance step sync error:', err)
    })
  }, [sessionId, mia])

  const updateStep = useCallback(async (step: number) => {
    if (!sessionId) return

    try {
      await mia.onboarding.updateStep(step)
      setState(prev => ({ ...prev, step }))
    } catch (err) {
      console.error('[ONBOARDING] Update step error:', err)
    }
  }, [sessionId, mia])

  const fetchBronzeHighlight = useCallback(async (platform?: string): Promise<BronzeFact | null> => {
    if (!sessionId) return null

    try {
      const data = await mia.onboarding.getBronzeHighlight(platform)
      const fact = mapBronzeFact(data)
      setState(prev => ({ ...prev, currentBronzeFact: fact, bronzeReady: true }))
      return fact
    } catch (err) {
      console.error('[ONBOARDING] Bronze highlight error:', err)
    }
    return null
  }, [sessionId, mia])

  const fetchBronzeFollowup = useCallback(async (platform?: string): Promise<BronzeFact | null> => {
    if (!sessionId) return null

    try {
      const data = await mia.onboarding.getBronzeFollowup(platform)
      return mapBronzeFact(data)
    } catch (err) {
      console.error('[ONBOARDING] Bronze followup error:', err)
    }
    return null
  }, [sessionId, mia])

  const startGrowInsightsAsync = useCallback(async (): Promise<string | null> => {
    if (!sessionId) return null

    try {
      const { taskId } = await mia.onboarding.startGrowInsightsAsync()
      setState(prev => ({
        ...prev,
        growTaskId: taskId,
        growInsightsReady: false,
        growInsightsProgress: 0
      }))
      return taskId
    } catch (err) {
      console.error('[ONBOARDING] Start grow async error:', err)
    }
    return null
  }, [sessionId, mia])

  const checkGrowInsightsStatus = useCallback(async (taskIdOverride?: string): Promise<boolean> => {
    const taskId = taskIdOverride || state.growTaskId
    console.log('[ONBOARDING] checkGrowInsightsStatus called, taskId:', taskId)
    if (!taskId) {
      console.log('[ONBOARDING] No growTaskId available, returning false')
      return false
    }

    try {
      const data = await mia.onboarding.checkGrowInsightsStatus(taskId)
      console.log('[ONBOARDING] Task status:', data.status, 'progress:', data.progress)
      const isComplete = data.status === 'completed'
      const progress = data.progress || 0

      // Extract summary from result if completed
      let summary: string | null = null
      if (isComplete && data.result) {
        summary = data.result.summary || null
      }

      setState(prev => ({
        ...prev,
        growInsightsReady: isComplete,
        growInsightsProgress: progress,
        growInsightsSummary: summary,
      }))

      return isComplete
    } catch (err) {
      console.error('[ONBOARDING] Check grow status error:', err)
    }
    return false
  }, [state.growTaskId, mia])

  const completeOnboarding = useCallback(async () => {
    if (!sessionId) return

    try {
      await mia.onboarding.complete(state.platformsConnected)
      setState(prev => ({
        ...prev,
        completed: true,
        step: ONBOARDING_STEPS.COMPLETED,
      }))

      // CRITICAL FIX (Jan 2026): Refresh workspace data to update connected_platforms
      // This ensures main page icons show correctly after onboarding without requiring page refresh
      console.log('[ONBOARDING] Refreshing workspace data after completion...')
      await refreshWorkspaces()
      await checkExistingAuth()
      console.log('[ONBOARDING] Workspace data refreshed - main page icons should update')
    } catch (err) {
      console.error('[ONBOARDING] Complete error:', err)
    }
  }, [sessionId, state.platformsConnected, refreshWorkspaces, checkExistingAuth, mia])

  const skipOnboarding = useCallback(async () => {
    if (!sessionId) return

    try {
      await mia.onboarding.skip()
      setState(prev => ({
        ...prev,
        skipped: true,
        completed: true,
        step: ONBOARDING_STEPS.COMPLETED,
      }))

      // CRITICAL FIX (Jan 2026): Refresh workspace data after skipping too
      console.log('[ONBOARDING] Refreshing workspace data after skip...')
      await refreshWorkspaces()
    } catch (err) {
      console.error('[ONBOARDING] Skip error:', err)
    }
  }, [sessionId, refreshWorkspaces, mia])

  const getAvailablePlatforms = useCallback(async (): Promise<{ id: string; name: string; connected: boolean }[]> => {
    if (!sessionId) return []

    try {
      return await mia.onboarding.getAvailablePlatforms()
    } catch (err) {
      console.error('[ONBOARDING] Available platforms error:', err)
    }
    return []
  }, [sessionId, mia])

  const reset = useCallback(() => {
    setState({
      step: 0,
      completed: false,
      skipped: false,
      platformsConnected: [],
      platformCount: 0,
      fullAccess: false,
      bronzeReady: false,
      currentBronzeFact: null,
      growTaskId: null,
      growInsightsReady: false,
      growInsightsProgress: 0,
      growInsightsSummary: null,
      isLoading: false,
      error: null,
    })
  }, [])

  const contextValue: OnboardingContextType = {
    ...state,
    loadOnboardingStatus,
    advanceStep,
    updateStep,
    fetchBronzeHighlight,
    fetchBronzeFollowup,
    startGrowInsightsAsync,
    checkGrowInsightsStatus,
    completeOnboarding,
    skipOnboarding,
    getAvailablePlatforms,
    reset,
  }

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  )
}

export default OnboardingContext
