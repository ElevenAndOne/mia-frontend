/**
 * Google OAuth Authentication Service
 */

import { APIClient } from '../client'
import type { GoogleAuthStatus, APIResponse, AuthUser, UserSession, GoogleAdsAccount, GA4Account, CombinedAccount } from '../types'

export class AuthService {
  private readonly client: APIClient
  private session: UserSession | null = null

  constructor(client: APIClient) {
    this.client = client
  }

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

  // ============= Session Management =============

  /**
   * Check auth status and return AuthUser if authenticated
   */
  async checkAuthStatus(): Promise<AuthUser | null> {
    try {
      const response = await this.checkStatus()
      
      if (!response.success || !response.data?.authenticated || !response.data.user_info) {
        return null
      }

      const user: AuthUser = {
        email: response.data.user_info.email,
        isAuthenticated: true,
        needsSetup: !this.hasCompletedSetup()
      }
      
      return user
    } catch (error) {
      console.error('Auth status check error:', error)
      return null
    }
  }

  /**
   * Save session to memory and localStorage
   */
  saveSession(session: UserSession): void {
    this.session = session
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mia_session', JSON.stringify({
        selectedAccount: session.selectedAccount,
        hasCompletedSetup: session.hasCompletedSetup,
        userEmail: session.user.email
      }))
    }
  }

  /**
   * Get current session from memory or localStorage
   */
  getSession(): UserSession | null {
    if (this.session) return this.session
    
    // Try to restore from localStorage
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('mia_session')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          return {
            user: { 
              email: data.userEmail, 
              isAuthenticated: true,
              needsSetup: !data.hasCompletedSetup 
            },
            selectedAccount: data.selectedAccount,
            hasCompletedSetup: data.hasCompletedSetup
          }
        } catch (_e) {
          localStorage.removeItem('mia_session')
        }
      }
    }
    
    return null
  }

  /**
   * Check if user has completed initial setup
   */
  hasCompletedSetup(): boolean {
    const session = this.getSession()
    return session?.hasCompletedSetup || false
  }

  /**
   * Complete user setup with selected account
   */
  completeSetup(account: GoogleAdsAccount | GA4Account | CombinedAccount, user: AuthUser): void {
    const session: UserSession = {
      user,
      selectedAccount: account,
      hasCompletedSetup: true
    }
    this.saveSession(session)
  }

  /**
   * Update selected account in current session
   */
  updateSelectedAccount(account: GoogleAdsAccount | GA4Account | CombinedAccount): void {
    if (this.session) {
      this.session.selectedAccount = account
      this.saveSession(this.session)
    }
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    this.session = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('mia_session')
    }
  }
}
