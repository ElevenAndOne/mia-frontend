/**
 * Session utility functions
 */
import { StorageKey } from '../constants/storage-keys'

/**
 * Generate a unique session ID
 */
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Detect if running on mobile (iOS Safari is particularly strict about popups)
 */
export const isMobile = (): boolean => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

/**
 * Get or create session ID from localStorage
 */
export const getOrCreateSessionId = (): string => {
  let sessionId = localStorage.getItem(StorageKey.SESSION_ID)
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem(StorageKey.SESSION_ID, sessionId)
  }
  return sessionId
}

/**
 * Clear session data from localStorage
 */
export const clearSessionStorage = (): void => {
  localStorage.removeItem(StorageKey.SESSION_ID)
  localStorage.removeItem(StorageKey.LAST_USER_ID)
  localStorage.removeItem(StorageKey.APP_STATE)
  // Clear OAuth state flags (prevents stale state on re-login)
  localStorage.removeItem(StorageKey.OAUTH_PENDING)
  localStorage.removeItem(StorageKey.OAUTH_RETURN_URL)
  localStorage.removeItem('pending_platform_connect')
}

/**
 * Store session ID in localStorage
 */
export const storeSessionId = (sessionId: string): void => {
  localStorage.setItem(StorageKey.SESSION_ID, sessionId)
}

/**
 * Get stored session ID from localStorage
 */
export const getStoredSessionId = (): string | null => {
  return localStorage.getItem(StorageKey.SESSION_ID)
}
