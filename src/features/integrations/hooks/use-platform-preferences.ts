import { useState, useRef, useEffect, useCallback } from 'react'
import { apiFetch, createSessionHeaders } from '../../../utils/api'

const KNOWN_CONNECTED_KEY = 'mia_known_connected_platforms'

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
  const [selectedPlatforms, setSelectedPlatformsState] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const prevConnectedRef = useRef<string[]>([])
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)
  const connectedPlatformsRef = useRef(connectedPlatforms)
  connectedPlatformsRef.current = connectedPlatforms

  useEffect(() => {
    if (!sessionId) return

    const loadPreferences = async () => {
      setIsLoading(true)

      // CRITICAL: Read lastKnown BEFORE the async fetch to avoid race condition.
      // The sessionStorage sync effect (3rd useEffect) fires synchronously during
      // the same render, updating sessionStorage with current connectedPlatforms.
      // If we read AFTER the await, lastKnown would match currentConnected and
      // newlyConnected would always be empty.
      let lastKnown: string[] = []
      try {
        const raw = sessionStorage.getItem(KNOWN_CONNECTED_KEY)
        if (raw) lastKnown = JSON.parse(raw)
      } catch { /* sessionStorage unavailable */ }

      const saved = await fetchPlatformPreferences(sessionId)

      // Use ref to access current value (avoids stale closure in async callback)
      const currentConnected = connectedPlatformsRef.current

      if (saved.length > 0) {
        const newlyConnected = currentConnected.filter(p => !lastKnown.includes(p))
        if (newlyConnected.length > 0) {
          console.log('[PlatformPrefs] Auto-enabling newly connected platforms:', newlyConnected)
          const combined = [...new Set([...saved, ...newlyConnected])]
          setSelectedPlatformsState(combined)
          savePlatformPreferences(sessionId, combined)
        } else {
          setSelectedPlatformsState(saved)
        }
      } else {
        // No saved prefs - default to all connected
        setSelectedPlatformsState(currentConnected)
      }

      // Persist known connected for cross-page detection
      if (currentConnected.length > 0) {
        try { sessionStorage.setItem(KNOWN_CONNECTED_KEY, JSON.stringify(currentConnected)) } catch {}
      }

      prevConnectedRef.current = [...currentConnected]
      hasLoadedRef.current = true
      setIsLoading(false)
    }

    loadPreferences()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connectedPlatforms is accessed via ref to avoid stale closures
  }, [sessionId, selectedAccountId]) // Reload when session or account changes

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

  // Keep sessionStorage in sync for cross-page new-platform detection
  useEffect(() => {
    if (connectedPlatforms.length > 0) {
      try { sessionStorage.setItem(KNOWN_CONNECTED_KEY, JSON.stringify(connectedPlatforms)) } catch {}
    }
  }, [connectedPlatforms])

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

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const setSelectedPlatforms = useCallback((platforms: string[]) => {
    setSelectedPlatformsState(prev => {
      saveToBackend(platforms, prev)
      return platforms
    })
  }, [saveToBackend])

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

  const filteredSelected = selectedPlatforms.filter(p => connectedPlatforms.includes(p))
  const effectivePlatforms = filteredSelected.length > 0 ? filteredSelected : connectedPlatforms

  return {
    selectedPlatforms: effectivePlatforms,
    setSelectedPlatforms,
    togglePlatform,
    isLoading,
    isSaving
  }
}
