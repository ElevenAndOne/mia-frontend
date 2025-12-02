/**
 * Custom hook for managing platform preferences
 * - Caches preferences with React Query (5 min cache)
 * - Debounces save operations (waits 1 second after last change)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'

interface UsePlatformPreferencesProps {
  sessionId: string | null
  selectedAccountId?: string | number
  connectedPlatforms: string[]
}

interface UsePlatformPreferencesResult {
  selectedPlatforms: string[]
  setSelectedPlatforms: (platforms: string[]) => void
  togglePlatform: (platformId: string) => void
  isLoading: boolean
  isSaving: boolean
}

async function fetchPlatformPreferences(sessionId: string): Promise<string[]> {
  const response = await apiFetch(`/api/account/platform-preferences?session_id=${sessionId}`)
  if (response.ok) {
    const data = await response.json()
    return data.selected_platforms || []
  }
  return []
}

async function savePlatformPreferences(sessionId: string, platforms: string[]): Promise<void> {
  await apiFetch('/api/account/platform-preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      selected_platforms: platforms
    })
  })
}

export function usePlatformPreferences({
  sessionId,
  selectedAccountId,
  connectedPlatforms
}: UsePlatformPreferencesProps): UsePlatformPreferencesResult {
  const queryClient = useQueryClient()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingPlatformsRef = useRef<string[] | null>(null)

  const queryKey = ['platform-preferences', sessionId, selectedAccountId]

  // Fetch preferences with caching
  const { data: savedPlatforms, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchPlatformPreferences(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Mutation for saving
  const saveMutation = useMutation({
    mutationFn: (platforms: string[]) => savePlatformPreferences(sessionId!, platforms),
    onSuccess: () => {
      // Invalidate cache after successful save
      queryClient.invalidateQueries({ queryKey: ['platform-preferences'] })
    }
  })

  // Calculate effective selected platforms
  // Filter saved platforms to only include currently connected ones
  const selectedPlatforms = savedPlatforms
    ? savedPlatforms.filter(p => connectedPlatforms.includes(p))
    : connectedPlatforms

  // If no valid saved platforms, default to all connected
  const effectivePlatforms = selectedPlatforms.length > 0 ? selectedPlatforms : connectedPlatforms

  // Debounced save function
  const debouncedSave = useCallback((platforms: string[]) => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Store the pending platforms
    pendingPlatformsRef.current = platforms

    // Set new timer - wait 1 second after last change
    debounceTimerRef.current = setTimeout(() => {
      if (pendingPlatformsRef.current && sessionId) {
        saveMutation.mutate(pendingPlatformsRef.current)
        pendingPlatformsRef.current = null
      }
    }, 1000)
  }, [sessionId, saveMutation])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        // Save any pending changes before unmount
        if (pendingPlatformsRef.current && sessionId) {
          savePlatformPreferences(sessionId, pendingPlatformsRef.current)
        }
      }
    }
  }, [sessionId])

  // Set platforms (with optimistic update + debounced save)
  const setSelectedPlatforms = useCallback((platforms: string[]) => {
    // Optimistic update - immediately update the cache
    queryClient.setQueryData(queryKey, platforms)
    // Debounced save to backend
    debouncedSave(platforms)
  }, [queryClient, queryKey, debouncedSave])

  // Toggle a single platform
  const togglePlatform = useCallback((platformId: string) => {
    const current = queryClient.getQueryData<string[]>(queryKey) || effectivePlatforms
    const newPlatforms = current.includes(platformId)
      ? current.filter(p => p !== platformId)
      : [...current, platformId]

    // Don't allow deselecting all platforms
    if (newPlatforms.length === 0) return

    setSelectedPlatforms(newPlatforms)
  }, [queryClient, queryKey, effectivePlatforms, setSelectedPlatforms])

  return {
    selectedPlatforms: effectivePlatforms,
    setSelectedPlatforms,
    togglePlatform,
    isLoading,
    isSaving: saveMutation.isPending
  }
}
