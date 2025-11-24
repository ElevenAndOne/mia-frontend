/**
 * Account Management Service
 */

import { APIClient } from '../client'
import { AccountCollections, AccountMappingRecord, APIResponse } from '../types'

export class AccountsService {
  constructor(private client: APIClient) {}

  /**
   * Get Google Ads accounts via MCP
   */
  async getGoogleAdsAccounts(): Promise<APIResponse<{ accounts: unknown[] }>> {
    return this.client.post('/api/mcp/google-ads-accounts', {
      tool: 'get_google_ads_accounts'
    })
  }

  /**
   * Get GA4 properties via MCP
   */
  async getGA4Properties(): Promise<APIResponse<{ properties: unknown[] }>> {
    return this.client.post('/api/mcp/ga4-properties', {
      tool: 'get_ga4_properties'
    })
  }

  /**
   * Get account collections (Google Ads, GA4, Combined)
   */
  async getAccountCollections(): Promise<APIResponse<AccountCollections>> {
    // This would typically call a specific endpoint or aggregate the data
    // For now, return a placeholder that services can override
    return {
      success: false,
      error: 'Not implemented - use accountService.getAccountCollections() instead'
    }
  }

  /**
   * Get available account mappings
   */
  async getAccountMappings(): Promise<APIResponse<{ accounts: AccountMappingRecord[] }>> {
    return this.client.get('/api/accounts/available')
  }

  /**
   * Select an account for the session
   */
  async selectAccount(accountId: string, industry?: string): Promise<APIResponse<void>> {
    return this.client.post('/api/accounts/select', {
      account_id: accountId,
      session_id: this.client.getSessionId(),
      ...(industry && { industry })
    })
  }
}
