import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { FeatureKey } from '../features/workspace/feature-keys'
import { useFeatures } from '../features/workspace/hooks/use-features'

/**
 * Route guard for feature-flagged pages (Sep 2026).
 *
 * The sidebar hides a flagged surface; this stops a deep link or a stale bookmark from
 * rendering it anyway. Fail-open like useFeatures(): while no workspace is loaded, or for a
 * flag the backend didn't send, the page renders — a missing flag must never lock someone
 * out. Staff always resolve to the agency experience server-side, so this never fires for
 * them inside a client's Basic workspace.
 */
export const RequireFeature = ({ flag, children }: { flag: FeatureKey; children: ReactNode }) => {
  const { isEnabled } = useFeatures()
  if (!isEnabled(flag)) return <Navigate to="/home" replace />
  return <>{children}</>
}
