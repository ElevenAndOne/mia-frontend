import type { ReactNode } from 'react'
import type { FeatureKey } from '../feature-keys'
import { useFeatures } from '../hooks/use-features'

interface FeatureGateProps {
  flag: FeatureKey
  children: ReactNode
  /** Rendered when the flag is off. Defaults to nothing. */
  fallback?: ReactNode
}

/**
 * Renders children only when the workspace has `flag` enabled.
 *
 *   <FeatureGate flag="budget_tracker"><BudgetTrackerNav /></FeatureGate>
 *
 * Same fail-open rule as useFeatures(): unknown/unloaded flags render the children.
 */
export const FeatureGate = ({ flag, children, fallback = null }: FeatureGateProps) => {
  const { isEnabled } = useFeatures()
  return <>{isEnabled(flag) ? children : fallback}</>
}
