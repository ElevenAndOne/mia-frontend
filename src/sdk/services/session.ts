/**
 * Session Management Service
 * 
 * Handles session lifecycle, validation, and storage.
 * Abstracts away session ID management from consumers.
 */

import { APIClient } from '../client'
import type { APIResponse, GoogleAuthStatus, MetaAuthStatus, AvailableAccountsResponse, MarketingAccount } from '../types'

export interface SessionValidationResponse {
  valid: boolean
  user?: {
    name: string
    email: string
    picture_url?: string
    user_id?: string
    google_user_id?: string
    has_seen_intro?: boolean
  }
  user_info?: {
    email: string
    name?: string
    picture?: string
    google_user_id: string
  }
  selected_account?: MarketingAccount
  authenticated?: boolean
  meta_authenticated?: boolean
  platforms?: {
    google?: boolean
    meta?: boolean
  }
}

export interface OAuthUrlResponse {
  auth_url: string
  state?: string
}

export interface OAuthCompleteResponse {
  success: boolean
  user_info?: {
    email: string
    name?: string
    picture?: string
    google_user_id: string
  }
  selected_account?: MarketingAccount
}

export interface OAuthPopupResultData {
  user_info?: GoogleAuthStatus['user_info'] | MetaAuthStatus['user_info']
  authenticated?: boolean
  selected_account?: MarketingAccount
}

export class SessionService {
  private readonly client: APIClient

  constructor(client: APIClient) {
    this.client = client
  }

  // ============= Session Management =============

  /**
   * Validate current session with backend
   */
  async validateSession(sessionId?: string): Promise<APIResponse<SessionValidationResponse>> {
    if (sessionId) {
      // Temporarily update client session for this call
      const originalSessionId = this.client.getSessionId()
      this.client.setSessionId(sessionId)
      const result = await this.client.get<SessionValidationResponse>(`/api/session/validate`, {
        params: { session_id: sessionId }
      })
      // Restore original session ID
      if (originalSessionId) {
        this.client.setSessionId(originalSessionId)
      }
      return result
    }

    return this.client.get<SessionValidationResponse>('/api/session/validate')
  }

  /**
   * Initialize or retrieve session ID
   */
  initializeSession(): string {
    let sessionId = this.client.getSessionId()
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.client.setSessionId(sessionId)
    }
    
    return sessionId
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.client.clearSessionId()
  }

  // ============= Google OAuth =============

  /**
   * Get Google OAuth URL
   */
  async getGoogleAuthUrl(): Promise<APIResponse<OAuthUrlResponse>> {
    return this.client.get<OAuthUrlResponse>('/api/oauth/google/auth-url')
  }

  /**
   * Complete Google OAuth flow
   */
  async completeGoogleOAuth(): Promise<APIResponse<OAuthCompleteResponse>> {
    return this.client.post<OAuthCompleteResponse>('/api/oauth/google/complete')
  }

  /**
   * Check Google authentication status
   */
  async checkGoogleAuthStatus(): Promise<APIResponse<GoogleAuthStatus>> {
    return this.client.get<GoogleAuthStatus>('/api/oauth/google/status')
  }

  /**
   * Logout from Google OAuth
   */
  async logoutGoogle(): Promise<APIResponse<void>> {
    return this.client.post<void>('/api/oauth/google/logout')
  }

  /**
   * Complete Google OAuth flow with popup
   */
  async loginGoogleWithPopup(): Promise<{ success: boolean; error?: string; data?: OAuthPopupResultData }> {
    try {
      // Get auth URL
      const urlResult = await this.getGoogleAuthUrl()
      
      if (!urlResult.success || !urlResult.data) {
        return {
          success: false,
          error: urlResult.error || 'Failed to get auth URL'
        }
      }

      // Open popup
      const popup = window.open(
        urlResult.data.auth_url,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        return {
          success: false,
          error: 'Popup blocked. Please allow popups for this site.'
        }
      }

      // Handle popup flow
      return new Promise((resolve) => {
        const pollTimer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer)

              // Complete OAuth by creating database session
              setTimeout(async () => {
                try {
                  const completeResult = await this.completeGoogleOAuth()
                  
                  if (completeResult.success) {
                    // Check auth status
                    const statusResult = await this.checkGoogleAuthStatus()
                    
                    if (statusResult.success && statusResult.data?.authenticated) {
                      resolve({
                        success: true,
                        data: {
                          user_info: statusResult.data.user_info,
                          authenticated: true
                        }
                      })
                    } else {
                      resolve({
                        success: false,
                        error: 'Authentication verification failed'
                      })
                    }
                  } else {
                    resolve({
                      success: false,
                      error: completeResult.error || 'OAuth completion failed'
                    })
                  }
                } catch (error) {
                  resolve({
                    success: false,
                    error: error instanceof Error ? error.message : 'Authentication failed'
                  })
                }
              }, 500)
            }
          } catch (_error) {
            clearInterval(pollTimer)
            resolve({
              success: false,
              error: 'Authentication window error'
            })
          }
        }, 1000)
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }
    }
  }

  // ============= Meta OAuth =============

  /**
   * Get Meta OAuth URL
   */
  async getMetaAuthUrl(): Promise<APIResponse<OAuthUrlResponse>> {
    return this.client.get<OAuthUrlResponse>('/api/oauth/meta/auth-url')
  }

  /**
   * Complete Meta OAuth flow
   */
  async completeMetaOAuth(): Promise<APIResponse<OAuthCompleteResponse>> {
    return this.client.post<OAuthCompleteResponse>('/api/oauth/meta/complete')
  }

  /**
   * Check Meta authentication status
   */
  async checkMetaAuthStatus(): Promise<APIResponse<MetaAuthStatus>> {
    return this.client.get<MetaAuthStatus>('/api/oauth/meta/status')
  }

  /**
   * Logout from Meta OAuth
   */
  async logoutMeta(): Promise<APIResponse<void>> {
    return this.client.post<void>('/api/oauth/meta/logout')
  }

  /**
   * Complete Meta OAuth flow with popup
   */
  async loginMetaWithPopup(): Promise<{ success: boolean; error?: string; data?: OAuthPopupResultData }> {
    try {
      // Get Meta auth URL
      const urlResult = await this.getMetaAuthUrl()
      
      if (!urlResult.success || !urlResult.data) {
        return {
          success: false,
          error: urlResult.error || 'Failed to get Meta auth URL'
        }
      }

      // Open popup for OAuth
      const popup = window.open(
        urlResult.data.auth_url,
        'meta-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        return {
          success: false,
          error: 'Popup blocked. Please allow popups for this site.'
        }
      }

      // Poll for completion
      return new Promise((resolve) => {
        const pollTimer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer)

              // Check Meta auth status
              setTimeout(async () => {
                try {
                  const statusResult = await this.checkMetaAuthStatus()
                  
                  if (statusResult.success && statusResult.data?.authenticated) {
                    // Complete Meta OAuth flow - create database session
                    const completeResult = await this.completeMetaOAuth()
                    
                    if (completeResult.success) {
                      resolve({
                        success: true,
                        data: statusResult.data
                      })
                    } else {
                      resolve({
                        success: false,
                        error: completeResult.error || 'Meta OAuth completion failed'
                      })
                    }
                  } else {
                    resolve({
                      success: false,
                      error: 'Meta authentication cancelled or failed'
                    })
                  }
                } catch (error) {
                  resolve({
                    success: false,
                    error: error instanceof Error ? error.message : 'Meta authentication failed'
                  })
                }
              }, 500)
            }
          } catch (_error) {
            clearInterval(pollTimer)
            resolve({
              success: false,
              error: 'Meta authentication window error'
            })
          }
        }, 1000)
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Meta login failed'
      }
    }
  }

  // ============= Account Operations =============

  /**
   * Get available accounts for current session
   */
  async getAvailableAccounts(): Promise<APIResponse<AvailableAccountsResponse>> {
    return this.client.get<AvailableAccountsResponse>('/api/accounts/available')
  }

  /**
   * Select an account for the current session
   */
  async selectAccount(accountId: string, businessType?: string, industry?: string): Promise<APIResponse<unknown>> {
    return this.client.post('/api/session/select-account', {
      account_id: accountId,
      business_type: businessType,
      industry: industry
    })
  }

  /**
   * Select MCC account for the current session
   */
  async selectMCC(mccId: string, mccName?: string): Promise<APIResponse<unknown>> {
    return this.client.post('/api/session/select-mcc', {
      mcc_id: mccId,
      mcc_name: mccName
    })
  }

  /**
   * Get OAuth authentication URL for a platform
   */
  async getAuthURL(platform: string): Promise<APIResponse<{ auth_url: string }>> {
    return this.client.get(`/api/oauth/${platform}/auth-url`)
  }

  /**
   * Complete OAuth authentication flow
   */
  async completeOAuth(platform: string, authCode?: string): Promise<APIResponse<unknown>> {
    const body = authCode ? { code: authCode } : undefined
    return this.client.post(`/api/oauth/${platform}/complete`, body)
  }

  /**
   * Bypass login with user ID for session restoration
   */
  async bypassLogin(userId: string): Promise<APIResponse<unknown>> {
    return this.client.post(`/api/oauth/bypass-login?user_id=${userId}`)
  }

  /**
   * Meta bypass login for session creation
   */
  async metaBypassLogin(): Promise<APIResponse<unknown>> {
    return this.client.post('/api/oauth/meta/bypass-login')
  }

  /**
   * Get Google authentication status
   */
  async getGoogleAuthStatus(): Promise<APIResponse<GoogleAuthStatus>> {
    return this.client.get<GoogleAuthStatus>('/api/oauth/google/status')
  }

  /**
   * Get Meta authentication status  
   */
  async getMetaAuthStatus(): Promise<APIResponse<MetaAuthStatus>> {
    return this.client.get<MetaAuthStatus>('/api/oauth/meta/status')
  }
}
