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
    } catch (error) {
      // Session invalid, clear it
      storage.clearSessionId()
      return null
    }
  },

  /**
   * Initiate Google OAuth flow
   */
  async loginWithGoogle(): Promise<boolean> {
    try {
      const response = await apiGet<{ auth_url: string }>(
        '/api/auth/google/initiate'
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
   */
  async loginWithMeta(): Promise<boolean> {
    try {
      const response = await apiGet<{ auth_url: string }>(
        '/api/auth/meta/initiate'
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
   */
  async logout(): Promise<void> {
    const sessionId = storage.getSessionId()
    if (!sessionId) return

    try {
      await apiPost('/api/auth/logout', { session_id: sessionId })
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Always clear local session
      storage.clearAll()
    }
  }
}
