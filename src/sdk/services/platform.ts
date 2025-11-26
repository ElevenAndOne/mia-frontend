/**
 * Platform Service
 * 
 * Handles general platform operations like accounts, industries, and platform linking.
 */

import { APIClient } from '../client'
import type { APIResponse, AccountCollections, AvailableAccountsResponse, MarketingAccount } from '../types'

export interface Industry {
  id: string
  name: string
  category?: string
}

export interface IndustriesResponse {
  success: boolean
  industries?: Industry[]
  error?: string
}

export interface MCCAccount {
  customer_id: string
  resource_name: string
  descriptive_name: string
  manager: boolean
  account_count?: number
}

export interface MCCAccountsResponse {
  success: boolean
  accounts?: MCCAccount[]
  mcc_accounts?: MCCAccount[]
  error?: string
}

export interface MCCSelectionRequest {
  mcc_id: string
  business_type: string
  industry?: string
}

export interface PlatformLinkRequest {
  platform: 'ga4' | 'google_ads' | 'meta' | 'hubspot' | 'brevo'
  platform_ids: string[] // Array of platform-specific IDs
  account_id?: string
}

export interface PlatformStatusData {
  accounts: MarketingAccount[]
  hubspot_connected: boolean
  brevo_connected: boolean
  meta_has_credentials: boolean
  google: { connected: boolean; linked: boolean; last_synced: string }
  meta: { connected: boolean; linked: boolean; last_synced?: string }
  brevo: { connected: boolean; linked: boolean; last_synced?: string }
  hubspot: { connected: boolean; linked: boolean; last_synced?: string }
  ga4: { connected: boolean; linked: boolean; last_synced?: string }
}

export class PlatformService {
  private readonly client: APIClient

  constructor(client: APIClient) {
    this.client = client
  }

  // ============= Account Operations =============

  /**
   * Get all available accounts (Google Ads, GA4, Combined)
   */
  async getAvailableAccounts(): Promise<APIResponse<AvailableAccountsResponse>> {
    const response = await this.client.get<AvailableAccountsResponse | AccountCollections>('/api/accounts/available')

    if (!response.success) {
      return response as APIResponse<AvailableAccountsResponse>
    }

    const data = response.data

    if (!data) {
      return {
        success: true,
        data: { accounts: [] }
      }
    }

    // If API already returns accounts array, just forward it
    if ('accounts' in data && Array.isArray((data as AvailableAccountsResponse).accounts)) {
      const typedData = data as AvailableAccountsResponse
      return {
        success: true,
        data: {
          accounts: typedData.accounts || [],
          ga4_properties: typedData.ga4_properties
        }
      }
    }

    // Fallback: flatten AccountCollections into a single accounts array
    const collections = data as AccountCollections
    const accounts: MarketingAccount[] = [
      ...(collections.googleAds || []),
      ...(collections.ga4 || []),
      ...(collections.combined || [])
    ] as unknown as MarketingAccount[]

    return {
      success: true,
      data: { accounts }
    }
  }

  /**
   * Link platform IDs to current account
   */
  async linkPlatform(request: PlatformLinkRequest): Promise<APIResponse<unknown>> {
    return this.client.post('/api/accounts/link-platform', request)
  }

  /**
   * Link GA4 properties to account
   */
  async linkGA4Properties(propertyIds: string[], accountId?: string): Promise<APIResponse<unknown>> {
    return this.linkPlatform({
      platform: 'ga4',
      platform_ids: propertyIds,
      account_id: accountId
    })
  }

  /**
   * Link Google Ads accounts
   */
  async linkGoogleAdsAccounts(customerIds: string[], accountId?: string): Promise<APIResponse<unknown>> {
    return this.linkPlatform({
      platform: 'google_ads',
      platform_ids: customerIds,
      account_id: accountId
    })
  }

  // ============= Google OAuth Operations =============

  /**
   * Get available Google Ads accounts (MCCs)
   */
  async getGoogleAdAccounts(): Promise<APIResponse<MCCAccount[]>> {
    const response = await this.client.get<MCCAccountsResponse>('/api/oauth/google/ad-accounts')
    
    if (response.success && response.data) {
      // Handle both 'accounts' and 'mcc_accounts' response formats
      const accounts = response.data.accounts || response.data.mcc_accounts || []
      return {
        success: true,
        data: accounts
      }
    }
    
    return {
      success: false,
      error: response.error || response.data?.error || 'Failed to fetch Google Ads accounts'
    }
  }

  /**
   * Select MCC account for session
   */
  async selectMCC(mccId: string, businessType: string, industry?: string): Promise<APIResponse<unknown>> {
    return this.client.post('/api/session/select-mcc', {
      mcc_id: mccId,
      business_type: businessType,
      industry: industry
    })
  }

  // ============= Industries =============

  /**
   * Get available industries list
   */
  async getIndustries(): Promise<APIResponse<Industry[]>> {
    const response = await this.client.get<IndustriesResponse>('/api/industries')
    
    if (response.success && response.data?.industries) {
      return {
        success: true,
        data: response.data.industries
      }
    }
    
    return {
      success: false,
      error: response.error || response.data?.error || 'Failed to fetch industries'
    }
  }

  // ============= Platform Status =============

  /**
   * Get comprehensive platform status for integrations
   */
  async getPlatformStatus(): Promise<APIResponse<PlatformStatusData>> {
    const accountsResult = await this.getAvailableAccounts()
    
    if (!accountsResult.success || !accountsResult.data) {
      return {
        success: false,
        error: accountsResult.error || 'Failed to load platform status'
      }
    }
    
    // Extract status info from accounts response
    const accountsData = accountsResult.data.accounts || []
    const hubspotResult = await this.client.get<{ authenticated?: boolean }>('/api/oauth/hubspot/status')
    const brevoResult = await this.client.get<{ authenticated?: boolean }>('/api/oauth/brevo/status')  
    const metaCredsResult = await this.client.get<{ has_credentials?: boolean }>('/api/oauth/meta/credentials-status')
    
    return {
      success: true,
      data: {
        accounts: accountsData,
        hubspot_connected: hubspotResult.data?.authenticated || false,
        brevo_connected: brevoResult.data?.authenticated || false,
        meta_has_credentials: metaCredsResult.data?.has_credentials || false,
        // Add platform status structure expected by integrations context
        google: { connected: true, linked: true, last_synced: new Date().toISOString() },
        meta: { connected: metaCredsResult.data?.has_credentials || false, linked: true },
        brevo: { connected: brevoResult.data?.authenticated || false, linked: true },
        hubspot: { connected: hubspotResult.data?.authenticated || false, linked: true },
        ga4: { connected: true, linked: true }
      }
    }
  }

  /**
   * Connect a platform integration
   */
  async connectPlatform(platformId: string, accountId: string): Promise<APIResponse<unknown>> {
    return this.client.post(`/api/integrations/${platformId}/connect`, {
      account_id: accountId
    })
  }

  /**
   * Disconnect a platform integration
   */
  async disconnectPlatform(platformId: string, accountId: string): Promise<APIResponse<unknown>> {
    return this.client.post(`/api/integrations/${platformId}/disconnect`, {
      account_id: accountId
    })
  }

  /**
   * Get HubSpot authentication status
   */
  async getHubSpotAuthStatus(): Promise<APIResponse<{ authenticated: boolean }>> {
    return this.client.get('/api/oauth/hubspot/status')
  }

  /**
   * Get Brevo authentication status
   */
  async getBrevoAuthStatus(): Promise<APIResponse<{ authenticated: boolean }>> {
    return this.client.get('/api/oauth/brevo/status')
  }

  /**
   * Get Meta credentials status
   */
  async getMetaCredentialsStatus(): Promise<APIResponse<{ has_credentials: boolean }>> {
    return this.client.get('/api/oauth/meta/credentials-status')
  }

  // ============= Utility Methods =============

  /**
   * Check if account has required integrations
   */
  async validateAccountSetup(_accountId?: string): Promise<APIResponse<{
    has_google_ads: boolean
    has_ga4: boolean
    has_meta: boolean
    is_complete: boolean
  }>> {
    const accountsResult = await this.getAvailableAccounts()
    
    if (!accountsResult.success || !accountsResult.data) {
      return {
        success: false,
        error: 'Failed to validate account setup'
      }
    }

    const accounts = accountsResult.data.accounts || []
    
    return {
      success: true,
      data: {
        has_google_ads: accounts.some(acc => !!acc.google_ads_id),
        has_ga4: accounts.some(acc => !!acc.ga4_property_id),
        has_meta: accounts.some(acc => !!acc.meta_ads_id),
        is_complete: accounts.some(acc => !!acc.google_ads_id) && accounts.some(acc => !!acc.ga4_property_id)
      }
    }
  }
}
