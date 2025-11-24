/**
 * Platform Service
 * 
 * Handles general platform operations like accounts, industries, and platform linking.
 */

import { APIClient } from '../client'
import { APIResponse, AccountCollections, GoogleAdsAccount, GA4Account } from '../types'

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

export class PlatformService {
  constructor(private client: APIClient) {}

  // ============= Account Operations =============

  /**
   * Get all available accounts (Google Ads, GA4, Combined)
   */
  async getAvailableAccounts(): Promise<APIResponse<AccountCollections>> {
    return this.client.get<AccountCollections>('/api/accounts/available')
  }

  /**
   * Link platform IDs to current account
   */
  async linkPlatform(request: PlatformLinkRequest): Promise<APIResponse<any>> {
    return this.client.post('/api/accounts/link-platform', request)
  }

  /**
   * Link GA4 properties to account
   */
  async linkGA4Properties(propertyIds: string[], accountId?: string): Promise<APIResponse<any>> {
    return this.linkPlatform({
      platform: 'ga4',
      platform_ids: propertyIds,
      account_id: accountId
    })
  }

  /**
   * Link Google Ads accounts
   */
  async linkGoogleAdsAccounts(customerIds: string[], accountId?: string): Promise<APIResponse<any>> {
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
  async selectMCC(mccId: string, businessType: string, industry?: string): Promise<APIResponse<any>> {
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
  async getPlatformStatus(): Promise<APIResponse<any>> {
    const response = await this.getAvailableAccounts()
    
    if (!response.success) {
      return response
    }
    
    // Extract status info from accounts response
    const accountsData = response.data
    const hubspotResult = await this.client.get('/api/oauth/hubspot/status')
    const brevoResult = await this.client.get('/api/oauth/brevo/status')  
    const metaCredsResult = await this.client.get('/api/oauth/meta/credentials-status')
    
    return {
      success: true,
      data: {
        accounts: accountsData,
        hubspot_connected: (hubspotResult.data as any)?.authenticated || false,
        brevo_connected: (brevoResult.data as any)?.authenticated || false,
        meta_has_credentials: (metaCredsResult.data as any)?.has_credentials || false,
        // Add platform status structure expected by integrations context
        google: { connected: true, linked: true, last_synced: new Date().toISOString() },
        meta: { connected: (metaCredsResult.data as any)?.has_credentials || false, linked: true },
        brevo: { connected: (brevoResult.data as any)?.authenticated || false, linked: true },
        hubspot: { connected: (hubspotResult.data as any)?.authenticated || false, linked: true },
        ga4: { connected: true, linked: true }
      }
    }
  }

  /**
   * Connect a platform integration
   */
  async connectPlatform(platformId: string, accountId: string): Promise<APIResponse<any>> {
    return this.client.post(`/api/integrations/${platformId}/connect`, {
      account_id: accountId
    })
  }

  /**
   * Disconnect a platform integration
   */
  async disconnectPlatform(platformId: string, accountId: string): Promise<APIResponse<any>> {
    return this.client.post(`/api/integrations/${platformId}/disconnect`, {
      account_id: accountId
    })
  }

  /**
   * Get Google Ad (MCC) accounts
   */
  async getGoogleAdAccounts(): Promise<APIResponse<any[]>> {
    return this.client.get('/api/oauth/google/ad-accounts')
  }

  /**
   * Link GA4 properties
   */
  async linkGA4Properties(propertyIds: string[], accountId: string): Promise<APIResponse<any>> {
    return this.client.post('/api/accounts/link-platform', {
      account_id: accountId,
      platform: 'ga4',
      platform_id: propertyIds.join(',')
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
  async validateAccountSetup(accountId?: string): Promise<APIResponse<{
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

    const { googleAds, ga4, combined } = accountsResult.data
    
    return {
      success: true,
      data: {
        has_google_ads: googleAds.length > 0 || combined.length > 0,
        has_ga4: ga4.length > 0 || combined.length > 0,
        has_meta: false, // Would need to check Meta accounts separately
        is_complete: (googleAds.length > 0 || combined.length > 0) && (ga4.length > 0 || combined.length > 0)
      }
    }
  }
}
