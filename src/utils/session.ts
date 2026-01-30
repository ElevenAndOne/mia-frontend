/**
 * Session utility functions
 */

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
  let sessionId = localStorage.getItem('mia_session_id')
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem('mia_session_id', sessionId)
  }
  return sessionId
}

/**
 * Clear session data from localStorage
 */
export const clearSessionStorage = (): void => {
  localStorage.removeItem('mia_session_id')
  localStorage.removeItem('mia_last_user_id')
  localStorage.removeItem('mia_app_state')
}

/**
 * Store session ID in localStorage
 */
export const storeSessionId = (sessionId: string): void => {
  localStorage.setItem('mia_session_id', sessionId)
}

/**
 * Get stored session ID from localStorage
 */
export const getStoredSessionId = (): string | null => {
  return localStorage.getItem('mia_session_id')
}
