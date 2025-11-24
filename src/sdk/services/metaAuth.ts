/**
 * Meta (Facebook) OAuth Authentication Service
 */

import { APIClient } from '../client'
import { MetaUserInfo, MetaAuthStatus, APIResponse } from '../types'

export class MetaAuthService {
  constructor(private client: APIClient) {}

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
    return this.client.post('/api/oauth/meta/logout')
  }
}
