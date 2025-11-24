/**
 * Meta (Facebook) OAuth Authentication Service
 */

import { APIClient } from '../client'
import { MetaUserInfo, MetaAuthStatus, APIResponse } from '../types'

export class MetaAuthService {
  private isAuthenticated: boolean = false
  private userInfo: MetaUserInfo | null = null

  constructor(private client: APIClient) {
    this.checkAuthStatusOnInit()
  }

  /**
   * Get Meta OAuth authorization URL
   */
  async getAuthUrl(): Promise<APIResponse<{ auth_url: string }>> {
    return this.client.get('/api/oauth/meta/auth-url')
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<APIResponse<{ user_info: MetaUserInfo }>> {
    return this.client.post('/api/oauth/meta/exchange-token', { code })
  }

  /**
   * Get current user info
   */
  async getUserInfo(): Promise<APIResponse<MetaUserInfo>> {
    return this.client.get('/api/oauth/meta/user-info')
  }

  /**
   * Check authentication status
   */
  async checkStatus(): Promise<APIResponse<MetaAuthStatus>> {
    return this.client.get('/api/oauth/meta/user-info')
  }

  /**
   * Check if credentials exist in database
   */
  async checkCredentialsStatus(): Promise<APIResponse<{ has_credentials: boolean }>> {
    return this.client.get('/api/oauth/meta/credentials-status')
  }

  /**
   * Logout and revoke tokens
   */
  async logout(): Promise<APIResponse<void>> {
    const result = await this.client.post('/api/oauth/meta/logout')
    
    // Clear local state
    this.isAuthenticated = false
    this.userInfo = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('meta_auth_status')
      localStorage.removeItem('meta_user_info')
    }
    
    return {
      success: result.success,
      error: result.error
    }
  }

  // ============= Local State Management =============

  /**
   * Check if user is authenticated (local state)
   */
  isUserAuthenticated(): boolean {
    return this.isAuthenticated
  }

  /**
   * Get cached user info
   */
  getCachedUserInfo(): MetaUserInfo | null {
    return this.userInfo
  }

  /**
   * Initialize auth status on service creation
   */
  private async checkAuthStatusOnInit(): Promise<void> {
    if (typeof localStorage === 'undefined') return

    const authStatus = localStorage.getItem('meta_auth_status')
    const userInfoStr = localStorage.getItem('meta_user_info')

    if (authStatus === 'authenticated' && userInfoStr) {
      try {
        // Verify with backend that we're still authenticated
        const response = await this.getUserInfo()
        
        if (response.success && response.data) {
          this.isAuthenticated = true
          this.userInfo = response.data
        } else {
          this.clearLocalState()
        }
      } catch {
        this.clearLocalState()
      }
    }
  }

  /**
   * Clear local authentication state
   */
  private clearLocalState(): void {
    this.isAuthenticated = false
    this.userInfo = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('meta_auth_status')
      localStorage.removeItem('meta_user_info')
    }
  }

  /**
   * Update local state after successful authentication
   */
  updateLocalState(userInfo: MetaUserInfo): void {
    this.isAuthenticated = true
    this.userInfo = userInfo
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('meta_auth_status', 'authenticated')
      localStorage.setItem('meta_user_info', JSON.stringify(userInfo))
    }
  }
}
