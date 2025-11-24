/**
 * Facebook/Meta Integration Service
 * 
 * Handles Facebook pages, Meta accounts, and Meta platform operations.
 */

import { APIClient } from '../client'
import { APIResponse, MetaAdsAccount } from '../types'

export interface FacebookPage {
  id: string
  name: string
  category: string
  access_token: string
  picture?: {
    data: {
      url: string
    }
  }
  about?: string
  fan_count?: number
  link?: string
}

export interface FacebookPagesResponse {
  success: boolean
  pages?: FacebookPage[]
  error?: string
}

export interface MetaAccountsResponse {
  success: boolean
  meta_accounts?: MetaAdsAccount[]
  error?: string
}

export interface MetaCredentialsStatus {
  has_credentials: boolean
  authenticated: boolean
  expires_at?: string
  error?: string
}

export interface FacebookPageLinkRequest {
  page_id: string | null
  account_id?: string
}

export interface MetaAccountLinkRequest {
  meta_account_id: string | null
  account_id?: string
}

export class FacebookService {
  constructor(private client: APIClient) {}

  // ============= Facebook Pages =============

  /**
   * Get available Facebook pages (from cache with 7-day TTL)
   */
  async getPages(): Promise<APIResponse<FacebookPage[]>> {
    const response = await this.client.get<FacebookPagesResponse>('/api/oauth/meta/api/organic/facebook-pages')
    
    if (response.success && response.data?.pages) {
      return {
        success: true,
        data: response.data.pages
      }
    }
    
    return {
      success: false,
      error: response.error || response.data?.error || 'Failed to fetch Facebook pages'
    }
  }

  /**
   * Link Facebook page to account (or unlink if pageId is null)
   */
  async linkPage(pageId: string | null, accountId?: string): Promise<APIResponse<unknown>> {
    return this.client.post('/api/oauth/meta/api/organic/link-page', {
      page_id: pageId,
      account_id: accountId
    })
  }

  /**
   * Unlink Facebook page from account
   */
  async unlinkPage(accountId?: string): Promise<APIResponse<unknown>> {
    return this.linkPage(null, accountId)
  }

  // ============= Meta Ad Accounts =============

  /**
   * Get available Meta ad accounts
   */
  async getMetaAccounts(): Promise<APIResponse<MetaAdsAccount[]>> {
    const response = await this.client.get<MetaAccountsResponse>('/api/oauth/meta/api/accounts/available')
    
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.meta_accounts || []
      }
    }
    
    return {
      success: false,
      data: response.data?.meta_accounts || [],
      error: response.error || response.data?.error || 'Failed to fetch Meta accounts'
    }
  }

  /**
   * Link Meta ad account (or unlink if metaAccountId is null)
   */
  async linkMetaAccount(metaAccountId: string | null, accountId?: string): Promise<APIResponse<unknown>> {
    return this.client.post('/api/oauth/meta/api/accounts/link', {
      meta_account_id: metaAccountId,
      account_id: accountId
    })
  }

  /**
   * Unlink Meta ad account from current account
   */
  async unlinkMetaAccount(accountId?: string): Promise<APIResponse<unknown>> {
    return this.linkMetaAccount(null, accountId)
  }

  // ============= Meta Credentials =============

  /**
   * Check Meta credentials status
   */
  async getCredentialsStatus(): Promise<APIResponse<MetaCredentialsStatus>> {
    return this.client.get<MetaCredentialsStatus>('/api/oauth/meta/credentials-status')
  }

  /**
   * Refresh Meta access token
   */
  async refreshCredentials(): Promise<APIResponse<unknown>> {
    return this.client.post('/api/oauth/meta/refresh-credentials')
  }

  // ============= Combined Operations =============

  /**
   * Get all Meta-related data for account setup
   */
  async getMetaSetupData(): Promise<APIResponse<{
    pages: FacebookPage[]
    accounts: MetaAdsAccount[]
    credentials: MetaCredentialsStatus
  }>> {
    try {
      const [pagesResult, accountsResult, credentialsResult] = await Promise.all([
        this.getPages(),
        this.getMetaAccounts(),
        this.getCredentialsStatus()
      ])

      return {
        success: true,
        data: {
          pages: pagesResult.data || [],
          accounts: accountsResult.data || [],
          credentials: credentialsResult.data || { has_credentials: false, authenticated: false }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Meta setup data'
      }
    }
  }
}
