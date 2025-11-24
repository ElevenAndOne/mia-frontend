/**
 * Account Management Service
 */

import { APIClient } from '../client'
import { 
  AccountCollections, 
  AccountMappingRecord, 
  APIResponse, 
  RawGoogleAdsAccount,
  RawGA4Property,
  GoogleAdsAccount,
  GA4Account,
  CombinedAccount
} from '../types'

export class AccountsService {
  private cachedCollections: AccountCollections | null = null
  private lastFetchTime: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
   * Get account collections (Google Ads, GA4, Combined) with caching
   */
  async getAccountCollections(): Promise<APIResponse<AccountCollections>> {
    try {
      const now = Date.now()
      
      // Return cached data if still valid
      if (this.cachedCollections && (now - this.lastFetchTime) < this.CACHE_DURATION) {
        console.log('🔄 [ACCOUNTS-SERVICE] Returning cached account collections')
        return {
          success: true,
          data: this.cachedCollections
        }
      }

      console.log('🔄 [ACCOUNTS-SERVICE] Fetching fresh account collections...')
      
      // Fetch both Google Ads and GA4 data in parallel
      const [googleAdsResult, ga4Result] = await Promise.allSettled([
        this.fetchGoogleAdsAccounts(),
        this.fetchGA4Properties()
      ])

      // Process Google Ads accounts
      let googleAdsAccounts: GoogleAdsAccount[] = []
      if (googleAdsResult.status === 'fulfilled') {
        googleAdsAccounts = this.processGoogleAdsData(googleAdsResult.value)
      } else {
        console.error('❌ [ACCOUNTS-SERVICE] Google Ads fetch failed:', googleAdsResult.reason)
      }

      // Process GA4 properties  
      let ga4Accounts: GA4Account[] = []
      if (ga4Result.status === 'fulfilled') {
        ga4Accounts = this.processGA4Data(ga4Result.value)
      } else {
        console.error('❌ [ACCOUNTS-SERVICE] GA4 fetch failed:', ga4Result.reason)
      }

      // Create combined accounts by pairing Google Ads with GA4
      const combinedAccounts = this.createCombinedAccounts(googleAdsAccounts, ga4Accounts)

      // Update hasMatching flags
      this.updateMatchingFlags(googleAdsAccounts, ga4Accounts)

      const collections: AccountCollections = {
        googleAds: googleAdsAccounts,
        ga4: ga4Accounts,
        combined: combinedAccounts
      }

      // Cache the results
      this.cachedCollections = collections
      this.lastFetchTime = now

      console.log('✅ [ACCOUNTS-SERVICE] Account collections updated:', {
        googleAds: googleAdsAccounts.length,
        ga4: ga4Accounts.length,
        combined: combinedAccounts.length
      })

      return {
        success: true,
        data: collections
      }
    } catch (error) {
      console.error('❌ [ACCOUNTS-SERVICE] Failed to get account collections:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch account collections'
      }
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

  // ============= Private Helper Methods =============

  /**
   * Fetch Google Ads accounts using MCP tool
   */
  private async fetchGoogleAdsAccounts(): Promise<unknown> {
    const response = await this.client.post('/api/mcp/google-ads-accounts', {
      tool: 'get_google_ads_accounts'
    })
    
    if (!response.success) {
      throw new Error(`Failed to fetch Google Ads accounts: ${response.error}`)
    }
    
    return response.data
  }

  /**
   * Fetch GA4 properties using MCP tool
   */
  private async fetchGA4Properties(): Promise<unknown> {
    const response = await this.client.post('/api/mcp/ga4-properties', {
      tool: 'get_ga4_properties'
    })
    
    if (!response.success) {
      throw new Error(`Failed to fetch GA4 properties: ${response.error}`)
    }
    
    return response.data
  }

  /**
   * Process raw Google Ads data into GoogleAdsAccount objects
   */
  private processGoogleAdsData(rawData: unknown): GoogleAdsAccount[] {
    if (
      !rawData ||
      typeof rawData !== 'object' ||
      !('accounts' in rawData) ||
      !Array.isArray((rawData as { accounts?: RawGoogleAdsAccount[] }).accounts)
    ) {
      console.warn('❌ [ACCOUNTS-SERVICE] Invalid Google Ads data structure')
      return []
    }

    const accounts = (rawData as { accounts: RawGoogleAdsAccount[] }).accounts

    return accounts
      .filter((account: RawGoogleAdsAccount) => !account.error)
      .map((account: RawGoogleAdsAccount) => ({
        id: `ads_${account.customer_id}`,
        name: account.descriptive_name || 'Unnamed Account',
        customer_id: account.customer_id,
        display_name: account.descriptive_name || 'Unnamed Account',
        raw_data: account,
        hasMatchingGA4: false
      }))
  }

  /**
   * Process raw GA4 data into GA4Account objects
   */
  private processGA4Data(rawData: unknown): GA4Account[] {
    if (
      !rawData ||
      typeof rawData !== 'object' ||
      !('properties' in rawData) ||
      !Array.isArray((rawData as { properties?: RawGA4Property[] }).properties)
    ) {
      console.warn('❌ [ACCOUNTS-SERVICE] Invalid GA4 data structure')
      return []
    }

    const properties = (rawData as { properties: RawGA4Property[] }).properties

    return properties.map((property: RawGA4Property) => ({
      id: `ga4_${property.property_id}`,
      name: property.display_name || 'Unnamed Property',
      property_id: property.property_id,
      display_name: property.display_name || 'Unnamed Property',
      raw_data: property,
      hasMatchingAds: false
    }))
  }

  /**
   * Create combined accounts by pairing Google Ads with GA4 properties
   */
  private createCombinedAccounts(googleAdsAccounts: GoogleAdsAccount[], ga4Accounts: GA4Account[]): CombinedAccount[] {
    const combined: CombinedAccount[] = []

    // Simple pairing strategy: match by similar names or create combinations
    googleAdsAccounts.forEach(adsAccount => {
      ga4Accounts.forEach(ga4Account => {
        // Basic name matching logic
        if (this.accountsMatch(adsAccount, ga4Account)) {
          combined.push({
            id: `combined_${adsAccount.customer_id}_${ga4Account.property_id}`,
            name: `${adsAccount.name} + ${ga4Account.name}`,
            google_ads_id: adsAccount.customer_id,
            ga4_property_id: ga4Account.property_id,
            display_name: `${adsAccount.display_name} + ${ga4Account.display_name}`,
            ads_data: adsAccount.raw_data,
            ga4_data: ga4Account.raw_data
          })
        }
      })
    })

    return combined
  }

  /**
   * Update hasMatching flags for accounts that have pairs
   */
  private updateMatchingFlags(googleAdsAccounts: GoogleAdsAccount[], ga4Accounts: GA4Account[]): void {
    googleAdsAccounts.forEach(adsAccount => {
      adsAccount.hasMatchingGA4 = ga4Accounts.some(ga4Account => 
        this.accountsMatch(adsAccount, ga4Account)
      )
    })

    ga4Accounts.forEach(ga4Account => {
      ga4Account.hasMatchingAds = googleAdsAccounts.some(adsAccount => 
        this.accountsMatch(adsAccount, ga4Account)
      )
    })
  }

  /**
   * Determine if Google Ads and GA4 accounts should be paired
   */
  private accountsMatch(adsAccount: GoogleAdsAccount, ga4Account: GA4Account): boolean {
    // Simple matching logic - can be enhanced
    const adsName = adsAccount.name.toLowerCase().trim()
    const ga4Name = ga4Account.name.toLowerCase().trim()
    
    return adsName.includes(ga4Name) || ga4Name.includes(adsName) || 
           adsName === ga4Name
  }

  /**
   * Clear cached data to force fresh fetch
   */
  clearCache(): void {
    this.cachedCollections = null
    this.lastFetchTime = 0
  }
}
