/**
 * Meta Ads Service
 */

import { APIClient } from '../client'
import { MetaAdsAccount, MetaCampaign, CampaignMetrics, MetaAdSet, MetaAd, APIResponse } from '../types'

export class MetaAdsService {
  constructor(private client: APIClient) {}

  /**
   * Get all Meta ad accounts
   */
  async getAccounts(): Promise<APIResponse<MetaAdsAccount[]>> {
    return this.client.get('/api/oauth/meta/accounts')
  }

  /**
   * Get campaigns for an ad account
   */
  async getCampaigns(accountId: string, includeMetrics: boolean = true): Promise<APIResponse<MetaCampaign[]>> {
    return this.client.get(`/api/oauth/meta/accounts/${accountId}/campaigns`, {
      params: includeMetrics ? { include_metrics: 'true' } : {}
    })
  }

  /**
   * Get account performance metrics
   */
  async getAccountPerformance(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<APIResponse<CampaignMetrics>> {
    return this.client.get(`/api/oauth/meta/accounts/${accountId}/performance`, {
      params: {
        start_date: startDate,
        end_date: endDate
      }
    })
  }

  /**
   * Get ad sets for an account
   */
  async getAdSets(accountId: string, campaignId?: string): Promise<APIResponse<MetaAdSet[]>> {
    const params = campaignId ? { campaign_id: campaignId } : undefined
    return this.client.get(`/api/oauth/meta/accounts/${accountId}/adsets`, { params })
  }

  /**
   * Get ads for an account
   */
  async getAds(accountId: string, adSetId?: string): Promise<APIResponse<MetaAd[]>> {
    const params = adSetId ? { adset_id: adSetId } : undefined
    return this.client.get(`/api/oauth/meta/accounts/${accountId}/ads`, { params })
  }
}
