/**
 * Centralized exports for all context providers and hooks
 * Import from this file for cleaner imports across the app
 * 
 * Example:
 * import { useAnalytics, useDateRange, useUIState } from '@/contexts'
 */

// Session Context (existing)
export { SessionProvider, useSession } from './session-context'
export type { 
  AccountMapping, 
  UserProfile, 
  MetaAuthState, 
  SessionState, 
  SessionActions 
} from './session-context'

// Date Range Context
export { DateRangeProvider, useDateRange } from './date-range-context'
export type { DateRangeOption, DateRangeState } from './date-range-context'

// UI State Context
export { UIStateProvider, useUIState } from './ui-state-context'
export type { ModalType, LoadingState, ModalData } from './ui-state-context'

// Analytics Context
export { AnalyticsProvider, useAnalytics } from './analytics-context'
export type { AnalyticsData, AnalyticsType } from './analytics-context'

// Integrations Context
export { IntegrationsProvider, useIntegrations } from './integrations-context'
export type { 
  PlatformStatus, 
  IntegrationsState, 
  Integration 
} from './integrations-context'
