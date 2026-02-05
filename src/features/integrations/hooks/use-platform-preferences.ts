/**
 * Custom hook for managing platform preferences
 * - All connected platforms default to ON (first time)
 * - Newly connected platforms auto-enable
 * - Toggles are instant (local state)
 * - Saves debounce to backend (1 second after last change)
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { apiFetch, createSessionHeaders } from '../../../utils/api'

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
  try {
    const response = await apiFetch(`/api/account/platform-preferences?session_id=${encodeURIComponent(sessionId)}`, {
      headers: createSessionHeaders(sessionId)
    })
    if (response.ok) {
      const data = await response.json()
      return data.selected_platforms || []
    }
  } catch (e) {
    console.error('[PlatformPrefs] Fetch error:', e)
  }
  return []
}

async function savePlatformPreferences(sessionId: string, platforms: string[]): Promise<void> {
  await apiFetch('/api/account/platform-preferences', {
    method: 'PUT',
    headers: createSessionHeaders(sessionId, true),
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
  // Simple local state for selected platforms
  const [selectedPlatforms, setSelectedPlatformsState] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Track previous connected platforms to detect new ones
  const prevConnectedRef = useRef<string[]>([])
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)
  // FEB 2026 FIX: Use ref to always access current connectedPlatforms value
  // This avoids stale closure issues in async callbacks
  const connectedPlatformsRef = useRef(connectedPlatforms)
  connectedPlatformsRef.current = connectedPlatforms

  // Load preferences on mount or when account changes
  useEffect(() => {
    if (!sessionId) return

    const loadPreferences = async () => {
      setIsLoading(true)
      // FEB 2026 FIX: Don't reset hasLoadedRef to false during reload
      // This was causing a race condition where the "new platforms" effect
      // would return early and never detect newly connected platforms

      const saved = await fetchPlatformPreferences(sessionId)

      // FEB 2026 FIX: Use ref to access current connectedPlatforms value
      // This avoids stale closure issues since the async fetch may complete
      // after connectedPlatforms has changed
      const currentConnected = connectedPlatformsRef.current

      if (saved.length > 0) {
        // FEB 2026 FIX: Don't filter here against connectedPlatforms (stale closure bug)
        // The filtering is already done at return value (line 166) which always uses
        // the current connectedPlatforms. Filtering here used stale values from closure.
        setSelectedPlatformsState(saved)
      } else {
        // No saved prefs - default to all connected
        setSelectedPlatformsState(currentConnected)
      }

      prevConnectedRef.current = [...currentConnected]
      hasLoadedRef.current = true
      setIsLoading(false)
    }

    loadPreferences()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connectedPlatforms is accessed via ref to avoid stale closures
  }, [sessionId, selectedAccountId]) // Reload when session or account changes

  // Detect newly connected platforms and auto-enable them
  useEffect(() => {
    if (!hasLoadedRef.current || connectedPlatforms.length === 0) return

    const prevConnected = prevConnectedRef.current
    const newPlatforms = connectedPlatforms.filter(p => !prevConnected.includes(p))

    if (newPlatforms.length > 0) {
      console.log('[PlatformPrefs] New platforms detected, enabling:', newPlatforms)
      setSelectedPlatformsState(prev => {
        const combined = [...new Set([...prev, ...newPlatforms])]
        // Also save to backend
        if (sessionId) {
          savePlatformPreferences(sessionId, combined)
        }
        return combined
      })
    }

    prevConnectedRef.current = [...connectedPlatforms]
  }, [connectedPlatforms, sessionId])

  // Debounced save to backend with rollback on failure
  const saveToBackend = useCallback((platforms: string[], rollbackTo: string[]) => {
    if (!sessionId) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await savePlatformPreferences(sessionId, platforms)
      } catch (e) {
        console.error('[PlatformPrefs] Save error, rolling back:', e)
        // Rollback to previous state on failure
        setSelectedPlatformsState(rollbackTo)
      }
      setIsSaving(false)
    }, 1000)
  }, [sessionId])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Set platforms (instant UI update + debounced save)
  // FEB 2026 FIX: Use functional update to avoid stale closure
  const setSelectedPlatforms = useCallback((platforms: string[]) => {
    setSelectedPlatformsState(prev => {
      saveToBackend(platforms, prev)
      return platforms
    })
  }, [saveToBackend])

  // Toggle a single platform
  const togglePlatform = useCallback((platformId: string) => {
    setSelectedPlatformsState(current => {
      const newPlatforms = current.includes(platformId)
        ? current.filter(p => p !== platformId)
        : [...current, platformId]

      // Don't allow deselecting all platforms
      if (newPlatforms.length === 0) return current

      // Save to backend (debounced) with rollback capability
      saveToBackend(newPlatforms, current)

      return newPlatforms
    })
  }, [saveToBackend])

  // Filter selected to only connected (in case platform was disconnected)
  const filteredSelected = selectedPlatforms.filter(p => connectedPlatforms.includes(p))

  // If all selected got disconnected, default to all connected
  const effectivePlatforms = filteredSelected.length > 0 ? filteredSelected : connectedPlatforms

  return {
    selectedPlatforms: effectivePlatforms,
    setSelectedPlatforms,
    togglePlatform,
    isLoading,
    isSaving
  }
}
