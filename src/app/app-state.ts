/**
 * App State Machine
 * Defines all possible app states and transitions
 */

export type AppState =
  | 'video-intro'
  | 'account-selection'
  | 'meta-account-selection'
  | 'onboarding-chat'
  | 'main'
  | 'integrations'
  | 'grow-quick'
  | 'optimize-quick'
  | 'protect-quick'
  | 'summary-quick'
  | 'invite'
  | 'workspace-settings'

// States that should be persisted across page refreshes
const PERSISTABLE_STATES: AppState[] = [
  'main',
  'integrations',
  'onboarding-chat',
  'grow-quick',
  'optimize-quick',
  'protect-quick',
  'summary-quick',
  'workspace-settings',
]

const STORAGE_KEY = 'mia_app_state'

/**
 * Get the initial app state from localStorage or default to video-intro
 */
export function getInitialState(): AppState {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && PERSISTABLE_STATES.includes(saved as AppState)) {
    return saved as AppState
  }
  return 'video-intro'
}

/**
 * Persist the current state to localStorage
 */
export function persistState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, state)
}

/**
 * Context for computing state transitions
 */
export interface AppContext {
  isLoading: boolean
  isAuthenticated: boolean
  isMetaAuthenticated: boolean
  hasSelectedAccount: boolean
  hasSeenIntro: boolean
  hasActiveWorkspace: boolean
  hasAvailableWorkspaces: boolean
  justAcceptedInvite: boolean
  hasPendingInvite: boolean
}

/**
 * Compute the next state based on current state and context
 * Returns null if no transition should happen
 */
export function computeNextState(
  current: AppState,
  ctx: AppContext
): AppState | null {
  const isAnyAuthenticated = ctx.isAuthenticated || ctx.isMetaAuthenticated

  // Don't compute transitions while loading
  if (ctx.isLoading) return null

  // Don't redirect from invite page
  if (current === 'invite') return null

  // Check for pending invite after login
  if (isAnyAuthenticated && ctx.hasPendingInvite) {
    return 'invite'
  }

  // Handle video-intro state
  if (current === 'video-intro') {
    // Priority 1: Returning user with session → Skip to main
    if (ctx.hasSeenIntro && isAnyAuthenticated && ctx.hasSelectedAccount) {
      return 'main'
    }

    // Priority 2: Returning user authenticated but no account → Account selection
    if (ctx.hasSeenIntro && isAnyAuthenticated && !ctx.hasSelectedAccount) {
      return 'account-selection'
    }

    // Priority 3 & 4: Stay on video-intro
    return null
  }

  // If user is logged out, reset to video-intro
  if (!isAnyAuthenticated && !ctx.hasSelectedAccount) {
    if (current !== 'video-intro') {
      return 'video-intro'
    }
    return null
  }

  // Don't auto-redirect from onboarding chat
  if (current === 'onboarding-chat') return null

  // Handle account selection completion
  if (ctx.hasSelectedAccount && current === 'account-selection') {
    if (!ctx.hasActiveWorkspace && !ctx.hasAvailableWorkspaces) {
      // Show workspace modal (handled separately)
      return null
    }
    if (ctx.justAcceptedInvite) {
      return 'main'
    }
    return 'onboarding-chat'
  }

  // User is authenticated but needs to select an account
  if (
    isAnyAuthenticated &&
    !ctx.hasSelectedAccount &&
    current !== 'account-selection' &&
    current !== 'meta-account-selection'
  ) {
    return 'account-selection'
  }

  return null
}
