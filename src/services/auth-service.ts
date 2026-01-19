import { apiGet, apiPost } from './api-client'
import { SessionResponse } from '../types'
import { storage } from '../utils/storage'

export const authService = {
  /**
   * Check for existing session
   */
  async checkExistingSession(): Promise<SessionResponse | null> {
    const sessionId = storage.getSessionId()
    if (!sessionId) return null

    try {
      const response = await apiGet<SessionResponse>(
        `/api/session/validate?session_id=${sessionId}`
      )
      return response
    } catch {
      // Session invalid, clear it
      storage.clearSessionId()
      return null
    }
  },

  /**
   * Initiate Google OAuth flow
   * Uses /api/oauth/google/auth-url endpoint per API spec
   */
  async loginWithGoogle(): Promise<boolean> {
    try {
      const frontendOrigin = encodeURIComponent(window.location.origin)
      const sessionId = storage.getSessionId()
      const response = await apiGet<{ auth_url: string }>(
        `/api/oauth/google/auth-url?session_id=${sessionId}&frontend_origin=${frontendOrigin}`
      )

      // Open OAuth popup
      const width = 500
      const height = 600
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2

      const popup = window.open(
        response.auth_url,
        'google_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      if (!popup) {
        console.error('Popup blocked')
        return false
      }

      // Mark OAuth pending
      storage.setOAuthPending('google')

      return true
    } catch (error) {
      console.error('Google login failed:', error)
      return false
    }
  },

  /**
   * Initiate Meta OAuth flow
   * Uses /api/oauth/meta/auth-url endpoint per API spec
   */
  async loginWithMeta(): Promise<boolean> {
    try {
      const sessionId = storage.getSessionId()
      const response = await apiGet<{ auth_url: string }>(
        `/api/oauth/meta/auth-url?session_id=${sessionId}`
      )

      // Open OAuth popup
      const width = 500
      const height = 600
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2

      const popup = window.open(
        response.auth_url,
        'meta_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      if (!popup) {
        console.error('Popup blocked')
        return false
      }

      storage.setOAuthPending('meta')

      return true
    } catch (error) {
      console.error('Meta login failed:', error)
      return false
    }
  },

  /**
   * Logout and clear session
   * Uses /api/oauth/google/logout endpoint per API spec
   */
  async logout(): Promise<void> {
    const sessionId = storage.getSessionId()
    if (!sessionId) return

    try {
      await apiPost('/api/oauth/google/logout', { session_id: sessionId })
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Always clear local session
      storage.clearAll()
    }
  }
}
