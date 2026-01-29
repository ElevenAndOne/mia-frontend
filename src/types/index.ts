/**
 * Global type re-exports
 *
 * Domain-specific types live with their features.
 * This barrel provides convenient imports for commonly used types.
 */

// Account types
export type { AccountMapping } from '../features/accounts/types'

// Auth types
export type { UserProfile, MetaAuthState } from '../features/auth/types'

// Workspace types
export type { Workspace } from '../features/workspace/types'

// Session types (state and actions remain in context)
export type { SessionState, SessionActions } from '../contexts/session-context'

// Onboarding types
export type {
  BronzeFact,
  OnboardingState,
  OnboardingActions,
} from '../features/onboarding/onboarding-context'

// Insights types
export type { ParsedInsight } from '../features/insights/hooks/use-streaming-insights-parsed'
