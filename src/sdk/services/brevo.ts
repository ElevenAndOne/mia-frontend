/**
 * Brevo Integration Service
 * 
 * Handles Brevo account management, authentication, and API operations.
 */

import { APIClient } from '../client'
import { APIResponse } from '../types'

export interface BrevoAccount {
  id: number
  brevo_id?: string
  account_name: string
  is_primary: boolean
  created_at: string
  email?: string
  company_name?: string
}

export interface BrevoAuthStatus {
  authenticated: boolean
  account_info?: BrevoAccount
  error?: string
}

export interface BrevoAccountsResponse {
  success: boolean
  accounts?: BrevoAccount[]
  error?: string
}

export interface BrevoApiKeyRequest {
  api_key: string
  account_id?: string
}

export class BrevoService {
  constructor(private client: APIClient) {}

  /**
   * Get available Brevo accounts
   */
  async getAccounts(): Promise<APIResponse<BrevoAccount[]>> {
    const response = await this.client.get<BrevoAccountsResponse>('/api/oauth/brevo/accounts')
    
    if (response.success && response.data?.accounts) {
      return {
        success: true,
        data: response.data.accounts
      }
    }
    
    return {
      success: false,
      error: response.error || response.data?.error || 'Failed to fetch Brevo accounts'
    }
  }

  /**
   * Select a Brevo account
   */
  async selectAccount(brevoId: number, accountId?: string): Promise<APIResponse<any>> {
    return this.client.post('/api/oauth/brevo/select-account', {
      brevo_id: brevoId.toString(),
      account_id: accountId
    })
  }

  /**
   * Disconnect a Brevo account
   */
  async disconnectAccount(brevoId?: number): Promise<APIResponse<void>> {
    if (brevoId !== undefined) {
      return this.client.delete('/api/oauth/brevo/disconnect', {
        params: { brevo_id: brevoId.toString() }
      })
    } else {
      // Generic disconnect for current session
      return this.client.delete('/api/oauth/brevo/disconnect')
    }
  }

  /**
   * Check Brevo authentication status
   */
  async getAuthStatus(): Promise<APIResponse<BrevoAuthStatus>> {
    return this.client.get<BrevoAuthStatus>('/api/oauth/brevo/status')
  }

  /**
   * Save Brevo API key
   */
  async saveApiKey(apiKey: string, accountId?: string): Promise<APIResponse<any>> {
    return this.client.post('/api/oauth/brevo/save-api-key', {
      api_key: apiKey,
      account_id: accountId
    })
  }

  /**
   * Test Brevo API key validity
   */
  async testApiKey(apiKey: string): Promise<APIResponse<{ valid: boolean; account_info?: BrevoAccount }>> {
    return this.client.post('/api/oauth/brevo/test-api-key', {
      api_key: apiKey
    })
  }

  /**
   * Update Brevo API key for existing account
   */
  async updateApiKey(brevoId: string, apiKey: string): Promise<APIResponse<any>> {
    return this.client.put('/api/oauth/brevo/update-api-key', {
      brevo_id: brevoId,
      api_key: apiKey
    })
  }
}
