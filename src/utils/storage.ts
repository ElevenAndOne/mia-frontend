const KEYS = {
  SESSION_ID: 'mia_session_id',
  LAST_USER_ID: 'mia_last_user_id',
  APP_STATE: 'mia_app_state',
  OAUTH_PENDING: 'mia_oauth_pending',
  OAUTH_RETURN_URL: 'mia_oauth_return_url',
  PENDING_PLATFORM_CONNECT: 'pending_platform_connect',
} as const

export const storage = {
  // Session
  getSessionId: (): string | null =>
    localStorage.getItem(KEYS.SESSION_ID),
  setSessionId: (id: string): void =>
    localStorage.setItem(KEYS.SESSION_ID, id),
  clearSessionId: (): void =>
    localStorage.removeItem(KEYS.SESSION_ID),

  // User
  getLastUserId: (): string | null =>
    localStorage.getItem(KEYS.LAST_USER_ID),
  setLastUserId: (id: string): void =>
    localStorage.setItem(KEYS.LAST_USER_ID, id),

  // App state
  getAppState: (): string | null =>
    localStorage.getItem(KEYS.APP_STATE),
  setAppState: (state: string): void =>
    localStorage.setItem(KEYS.APP_STATE, state),

  // OAuth
  getOAuthPending: (): string | null =>
    localStorage.getItem(KEYS.OAUTH_PENDING),
  setOAuthPending: (platform: string): void =>
    localStorage.setItem(KEYS.OAUTH_PENDING, platform),
  clearOAuthPending: (): void =>
    localStorage.removeItem(KEYS.OAUTH_PENDING),

  getOAuthReturnUrl: (): string | null =>
    localStorage.getItem(KEYS.OAUTH_RETURN_URL),
  setOAuthReturnUrl: (url: string): void =>
    localStorage.setItem(KEYS.OAUTH_RETURN_URL, url),
  clearOAuthReturnUrl: (): void =>
    localStorage.removeItem(KEYS.OAUTH_RETURN_URL),

  // Platform connection
  getPendingPlatformConnect: (): string | null =>
    localStorage.getItem(KEYS.PENDING_PLATFORM_CONNECT),
  setPendingPlatformConnect: (platform: string): void =>
    localStorage.setItem(KEYS.PENDING_PLATFORM_CONNECT, platform),
  clearPendingPlatformConnect: (): void =>
    localStorage.removeItem(KEYS.PENDING_PLATFORM_CONNECT),

  // Clear all
  clearAll: (): void => {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key))
  }
}
