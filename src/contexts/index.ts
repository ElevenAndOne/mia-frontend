/**
 * Centralized exports for all context providers and hooks
 * Import from this file for cleaner imports across the app
 * 
 * Example:
 * import { useAnalytics, useDateRange, useUIState } from '@/contexts'
 */

// Session Context (existing)
export { SessionProvider, useSession } from './SessionContext'
export type { 
  AccountMapping, 
  UserProfile, 
  MetaAuthState, 
  SessionState, 
  SessionActions 
} from './SessionContext'

// Date Range Context
export { DateRangeProvider, useDateRange } from './DateRangeContext'
export type { DateRangeOption, DateRangeState } from './DateRangeContext'

// UI State Context
export { UIStateProvider, useUIState } from './UIStateContext'
export type { ModalType, LoadingState, ModalData } from './UIStateContext'

// Analytics Context
export { AnalyticsProvider, useAnalytics } from './AnalyticsContext'
export type { AnalyticsData, AnalyticsType } from './AnalyticsContext'

// Integrations Context
export { IntegrationsProvider, useIntegrations } from './IntegrationsContext'
export type { 
  PlatformStatus, 
  IntegrationsState, 
  Integration 
} from './IntegrationsContext'
