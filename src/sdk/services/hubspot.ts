/**
 * HubSpot Integration Service
 * 
 * Handles HubSpot account management, authentication, and operations.
 */

import { APIClient } from '../client'
import { APIResponse } from '../types'

export interface HubSpotAccount {
  id: number
  portal_id: string
  account_name: string
  is_primary: boolean
}

export interface HubSpotAuthStatus {
  authenticated: boolean
  accounts?: HubSpotAccount[]
  error?: string
}

export interface HubSpotAccountsResponse {
  success: boolean
  accounts?: HubSpotAccount[]
  error?: string
}

export class HubSpotService {
  constructor(private client: APIClient) {}

  /**
   * Get available HubSpot accounts
   */
  async getAccounts(): Promise<APIResponse<HubSpotAccount[]>> {
    const response = await this.client.get<HubSpotAccountsResponse>('/api/oauth/hubspot/accounts')
    
    if (response.success && response.data?.accounts) {
      return {
        success: true,
        data: response.data.accounts
      }
    }
    
    return {
      success: false,
      error: response.error || response.data?.error || 'Failed to fetch HubSpot accounts'
    }
  }

  /**
   * Select a HubSpot account
   */
  async selectAccount(hubspotId: number): Promise<APIResponse<any>> {
    return this.client.post('/api/oauth/hubspot/select-account', null, {
      params: { hubspot_id: hubspotId.toString() }
    })
  }

  /**
   * Disconnect a HubSpot account
   */
  async disconnectAccount(hubspotId: number): Promise<APIResponse<void>> {
    return this.client.delete(`/api/oauth/hubspot/disconnect`, {
      params: { hubspot_id: hubspotId.toString() }
    })
  }

  /**
   * Check HubSpot authentication status
   */
  async getAuthStatus(): Promise<APIResponse<HubSpotAuthStatus>> {
    return this.client.get<HubSpotAuthStatus>('/api/oauth/hubspot/status')
  }

  /**
   * Save HubSpot API key for account
   */
  async saveApiKey(apiKey: string, accountId?: string): Promise<APIResponse<any>> {
    return this.client.post('/api/oauth/hubspot/save-api-key', {
      api_key: apiKey,
      account_id: accountId
    })
  }
}
