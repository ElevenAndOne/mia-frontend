/**
 * Custom hook for managing platform preferences
 * - All connected platforms default to ON (first time)
 * - Newly connected platforms auto-enable
 * - Toggles are instant (local state)
 * - Saves debounce to backend (1 second after last change)
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../utils/api'

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
    const response = await apiFetch(`/api/account/platform-preferences?session_id=${sessionId}`)
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
  // Simple local state for selected platforms
  const [selectedPlatforms, setSelectedPlatformsState] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Track previous connected platforms to detect new ones
  const prevConnectedRef = useRef<string[]>([])
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)

  // Load preferences on mount or when account changes
  useEffect(() => {
    if (!sessionId) return

    const loadPreferences = async () => {
      setIsLoading(true)
      hasLoadedRef.current = false

      const saved = await fetchPlatformPreferences(sessionId)

      if (saved.length > 0) {
        // Filter to only connected platforms
        const validPlatforms = saved.filter(p => connectedPlatforms.includes(p))
        setSelectedPlatformsState(validPlatforms.length > 0 ? validPlatforms : connectedPlatforms)
      } else {
        // No saved prefs - default to all connected
        setSelectedPlatformsState(connectedPlatforms)
      }

      prevConnectedRef.current = [...connectedPlatforms]
      hasLoadedRef.current = true
      setIsLoading(false)
    }

    loadPreferences()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connectedPlatforms is intentionally omitted to avoid re-fetching when it changes
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

  // Debounced save to backend
  const saveToBackend = useCallback((platforms: string[]) => {
    if (!sessionId) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await savePlatformPreferences(sessionId, platforms)
      } catch (e) {
        console.error('[PlatformPrefs] Save error:', e)
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
  const setSelectedPlatforms = useCallback((platforms: string[]) => {
    setSelectedPlatformsState(platforms)
    saveToBackend(platforms)
  }, [saveToBackend])

  // Toggle a single platform
  const togglePlatform = useCallback((platformId: string) => {
    setSelectedPlatformsState(current => {
      const newPlatforms = current.includes(platformId)
        ? current.filter(p => p !== platformId)
        : [...current, platformId]

      // Don't allow deselecting all platforms
      if (newPlatforms.length === 0) return current

      // Save to backend (debounced)
      saveToBackend(newPlatforms)

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
