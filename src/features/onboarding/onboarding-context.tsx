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
import { apiFetch } from '../../utils/api'
import { StorageKey } from '../../constants/storage-keys'
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

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { sessionId, selectedAccount, activeWorkspace, refreshWorkspaces, markOnboardingComplete } = useSession()

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
      const response = await apiFetch(`/api/onboarding/status?session_id=${encodeURIComponent(sessionId)}`, {
        headers: { 'X-Session-ID': sessionId }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[ONBOARDING] Status loaded:', {
          growTaskId: data.grow_task_id,
          step: data.step,
          bronzeReady: data.bronze_ready
        })
        setState(prev => ({
          ...prev,
          step: data.step || 0,
          completed: data.completed || false,
          platformsConnected: data.platforms_connected || [],
          platformCount: data.platform_count || 0,
          fullAccess: data.full_access || false,
          bronzeReady: data.bronze_ready || false,
          growTaskId: data.grow_task_id || null,
          isLoading: false,
        }))
        // Update deduplication tracking
        lastLoadTimeRef.current = Date.now()
        // Return the task ID directly so callers don't have to wait for state
        return data.grow_task_id || null
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load onboarding status'
        }))
      }
    } catch (err) {
      console.error('[ONBOARDING] Status load error:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to connect to server'
      }))
    } finally {
      // Always clear the loading ref so future loads can proceed
      isLoadingRef.current = false
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const advanceStep = useCallback(async () => {
    if (!sessionId) return

    // OPTIMIZATION: Update local state immediately (optimistic update)
    setState(prev => ({
      ...prev,
      step: Math.min(prev.step + 1, 5),
      completed: prev.step + 1 >= 5,
    }))

    // Sync to server in background (fire-and-forget)
    apiFetch(`/api/onboarding/advance?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      headers: { 'X-Session-ID': sessionId }
    }).catch(err => {
      console.error('[ONBOARDING] Advance step sync error:', err)
    })
  }, [sessionId])

  const updateStep = useCallback(async (step: number) => {
    if (!sessionId) return

    try {
      const response = await apiFetch('/api/onboarding/update-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ session_id: sessionId, step })
      })

      if (response.ok) {
        setState(prev => ({ ...prev, step }))
      }
    } catch (err) {
      console.error('[ONBOARDING] Update step error:', err)
    }
  }, [sessionId])

  const fetchBronzeHighlight = useCallback(async (platform?: string): Promise<BronzeFact | null> => {
    if (!sessionId) return null

    try {
      // Timeout after 10s to prevent hang if backend is unresponsive
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await apiFetch('/api/bronze/highlight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ session_id: sessionId, platform }),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (response.ok) {
        const data = await response.json()
        const fact: BronzeFact = {
          platform: data.platform,
          headline: data.headline,
          detail: data.detail,
          metric_value: data.metric_value,
          metric_name: data.metric_name,
        }
        setState(prev => ({ ...prev, currentBronzeFact: fact, bronzeReady: true }))
        return fact
      }
    } catch (err) {
      console.error('[ONBOARDING] Bronze highlight error:', err)
    }
    return null
  }, [sessionId])

  const fetchBronzeFollowup = useCallback(async (platform?: string): Promise<BronzeFact | null> => {
    if (!sessionId) return null

    try {
      const response = await apiFetch('/api/bronze/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ session_id: sessionId, platform })
      })

      if (response.ok) {
        const data = await response.json()
        return {
          platform: data.platform,
          headline: data.headline,
          detail: data.detail,
          metric_value: data.metric_value,
          metric_name: data.metric_name,
        }
      }
    } catch (err) {
      console.error('[ONBOARDING] Bronze followup error:', err)
    }
    return null
  }, [sessionId])

  const startGrowInsightsAsync = useCallback(async (): Promise<string | null> => {
    if (!sessionId) return null

    try {
      const response = await apiFetch('/api/insights/grow/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (response.ok) {
        const data = await response.json()
        const taskId = data.task_id
        setState(prev => ({
          ...prev,
          growTaskId: taskId,
          growInsightsReady: false,
          growInsightsProgress: 0
        }))
        return taskId
      }
    } catch (err) {
      console.error('[ONBOARDING] Start grow async error:', err)
    }
    return null
  }, [sessionId])

  const checkGrowInsightsStatus = useCallback(async (taskIdOverride?: string): Promise<boolean> => {
    const taskId = taskIdOverride || state.growTaskId
    console.log('[ONBOARDING] checkGrowInsightsStatus called, taskId:', taskId)
    if (!taskId) {
      console.log('[ONBOARDING] No growTaskId available, returning false')
      return false
    }

    try {
      const response = await apiFetch(`/api/insights/task/${taskId}`)

      if (response.ok) {
        const data = await response.json()
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
      }
    } catch (err) {
      console.error('[ONBOARDING] Check grow status error:', err)
    }
    return false
  }, [state.growTaskId])

  const completeOnboarding = useCallback(async () => {
    if (!sessionId) return

    try {
      const response = await apiFetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          session_id: sessionId,
          platforms_at_completion: state.platformsConnected
        })
      })

      if (response.ok) {
        setState(prev => ({
          ...prev,
          completed: true,
          step: ONBOARDING_STEPS.COMPLETED,
        }))

        // FEB 2026 FIX: Mark onboarding complete in session state to prevent redirect back
        markOnboardingComplete()

        // Persist to localStorage as fallback (backend may not return this flag on re-login)
        if (activeWorkspace?.tenant_id) {
          localStorage.setItem(`${StorageKey.ONBOARDING_COMPLETED_PREFIX}${activeWorkspace.tenant_id}`, 'true')
        }

        // CRITICAL FIX (Jan 2026): Refresh workspace data to update connected_platforms
        // This ensures main page icons show correctly after onboarding without requiring page refresh
        console.log('[ONBOARDING] Refreshing workspace data after completion...')
        await refreshWorkspaces()
        console.log('[ONBOARDING] Workspace data refreshed - main page icons should update')
      }
    } catch (err) {
      console.error('[ONBOARDING] Complete error:', err)
    }
  }, [sessionId, state.platformsConnected, activeWorkspace?.tenant_id, refreshWorkspaces, markOnboardingComplete])

  const skipOnboarding = useCallback(async () => {
    if (!sessionId) return

    try {
      const response = await apiFetch('/api/onboarding/skip', {
        method: 'POST',
        headers: { 'X-Session-ID': sessionId }
      })

      if (response.ok) {
        setState(prev => ({
          ...prev,
          skipped: true,
          step: 3, // Skipped second platform
        }))

        // FEB 2026 FIX: Mark onboarding complete in session state to prevent redirect back
        markOnboardingComplete()

        // Persist to localStorage as fallback (backend may not return this flag on re-login)
        if (activeWorkspace?.tenant_id) {
          localStorage.setItem(`${StorageKey.ONBOARDING_COMPLETED_PREFIX}${activeWorkspace.tenant_id}`, 'true')
        }

        // CRITICAL FIX (Jan 2026): Refresh workspace data after skipping too
        console.log('[ONBOARDING] Refreshing workspace data after skip...')
        await refreshWorkspaces()
      }
    } catch (err) {
      console.error('[ONBOARDING] Skip error:', err)
    }
  }, [sessionId, activeWorkspace?.tenant_id, refreshWorkspaces, markOnboardingComplete])

  const getAvailablePlatforms = useCallback(async (): Promise<{ id: string; name: string; connected: boolean }[]> => {
    if (!sessionId) return []

    try {
      const response = await apiFetch('/api/onboarding/available-platforms', {
        headers: { 'X-Session-ID': sessionId }
      })

      if (response.ok) {
        const data = await response.json()
        return data.all_platforms || []
      }
    } catch (err) {
      console.error('[ONBOARDING] Available platforms error:', err)
    }
    return []
  }, [sessionId])

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
