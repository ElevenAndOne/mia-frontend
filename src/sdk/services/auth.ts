/**
 * Google OAuth Authentication Service
 */

import { APIClient } from '../client'
import { GoogleAuthStatus, APIResponse } from '../types'

export class AuthService {
  constructor(private client: APIClient) {}

  /**
   * Get Google OAuth authorization URL
   */
  async getAuthUrl(): Promise<APIResponse<{ auth_url: string }>> {
    return this.client.get('/api/oauth/google/auth-url')
  }

  /**
   * Check current authentication status
   */
  async checkStatus(): Promise<APIResponse<GoogleAuthStatus>> {
    return this.client.get('/api/oauth/google/status')
  }

  /**
   * Complete OAuth flow after redirect
   */
  async completeOAuth(): Promise<APIResponse<void>> {
    return this.client.post('/api/oauth/google/complete')
  }

  /**
   * Logout and revoke tokens
   */
  async logout(): Promise<APIResponse<void>> {
    return this.client.post('/api/oauth/google/logout')
  }

  /**
   * Force logout and clear all tokens (nuclear option)
   */
  async forceLogout(): Promise<APIResponse<void>> {
    return this.client.post('/api/oauth/google/force-logout')
  }

  /**
   * Initiate popup-based OAuth flow
   */
  async loginWithPopup(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get auth URL
      const result = await this.getAuthUrl()
      
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to get auth URL'
        }
      }

      // Store OAuth state
      if (typeof window !== 'undefined') {
        const currentUrl = window.location.href
        localStorage.setItem('mia_oauth_pending', 'true')
        localStorage.setItem('mia_return_url', currentUrl)
      }

      // Open popup
      return new Promise((resolve) => {
        const popup = window.open(
          result.data!.auth_url,
          'google-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )

        if (!popup) {
          resolve({
            success: false,
            error: 'Popup blocked. Please allow popups and try again.'
          })
          return
        }

        // Poll for popup closure
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            
            // Check auth status after popup closes
            setTimeout(async () => {
              const status = await this.checkStatus()
              
              if (status.success && status.data?.authenticated) {
                resolve({ success: true })
              } else {
                resolve({
                  success: false,
                  error: 'Authentication was cancelled or failed'
                })
              }
            }, 2000)
          }
        }, 1000)

        // Listen for messages from popup
        const messageHandler = (event: MessageEvent) => {
          if (event.data && event.data.auth === 'success') {
            popup.close()
            clearInterval(checkClosed)
            window.removeEventListener('message', messageHandler)
            resolve({ success: true })
          }
        }

        window.addEventListener('message', messageHandler)
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }
    }
  }

  /**
   * Initiate redirect-based OAuth flow
   */
  async loginWithRedirect(): Promise<APIResponse<void>> {
    const result = await this.getAuthUrl()
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to get auth URL'
      }
    }

    // Store OAuth state
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.href
      localStorage.setItem('mia_oauth_pending', 'true')
      localStorage.setItem('mia_return_url', currentUrl)
      
      // Redirect to Google OAuth
      window.location.href = result.data.auth_url
    }

    return { success: true }
  }
}
