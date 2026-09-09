import { useCallback, useMemo } from 'react'
import { useSession } from '../../../contexts/session-context'
import type { FeatureFlags, FeatureKey } from '../feature-keys'

/**
 * Per-workspace feature flags (progressive-disclosure redesign, Sep 2026).
 *
 * Reads the `features` map the backend attaches to the active workspace. No extra fetch:
 * flags arrive with the workspace list / current-workspace payloads and update when the
 * workspace switches or refreshes.
 *
 * Fail-open: while no workspace is loaded, or for a key the backend didn't send, a flag
 * reads as ENABLED. A missing flag must never make a surface vanish — the redesign turns
 * things off deliberately via the registry, not by accident via a stale payload.
 */
export function useFeatures() {
  const { activeWorkspace } = useSession()
  const features: FeatureFlags = useMemo(
    () => activeWorkspace?.features ?? {},
    [activeWorkspace?.features]
  )

  const isEnabled = useCallback(
    (key: FeatureKey): boolean => {
      const value = features[key]
      return value === undefined ? true : value
    },
    [features]
  )

  return { features, isEnabled }
}

/** Convenience for a single flag: `const showReports = useFeature('reports')`. */
export function useFeature(key: FeatureKey): boolean {
  return useFeatures().isEnabled(key)
}
