import { BaseService, SessionOptions } from './baseService'
import type {
  CampaignMetrics,
  LinkMetaAccountRequest,
  LinkMetaAccountResponse,
  MetaAd,
  MetaAdsAccount,
  MetaAdSet,
  MetaAvailableAccountsResponse,
  MetaCampaign
} from '../types'

interface CampaignRequestOptions extends SessionOptions {
  includeMetrics?: boolean
}

interface PerformanceRequestOptions extends SessionOptions {
  startDate: string
  endDate: string
}

interface AdSetRequestOptions extends SessionOptions {
  campaignId?: string
}

interface AdRequestOptions extends SessionOptions {
  adSetId?: string
}

export class MetaAdsService extends BaseService {
  getAccounts(options?: SessionOptions): Promise<MetaAdsAccount[]> {
    return this.client.get<MetaAdsAccount[]>('/api/oauth/meta/accounts', {
      sessionId: options?.sessionId
    })
  }

  getLinkableAccounts(options?: SessionOptions): Promise<MetaAvailableAccountsResponse> {
    return this.client.get<MetaAvailableAccountsResponse>('/api/oauth/meta/api/accounts/available', {
      sessionId: options?.sessionId
    })
  }

  linkAccount(payload: LinkMetaAccountRequest, options?: SessionOptions): Promise<LinkMetaAccountResponse> {
    return this.client.post<LinkMetaAccountResponse>('/api/oauth/meta/api/accounts/link', payload, {
      sessionId: options?.sessionId
    })
  }

  getCampaigns(accountId: string, options?: CampaignRequestOptions): Promise<MetaCampaign[]> {
    return this.client.get<MetaCampaign[]>(`/api/oauth/meta/accounts/${accountId}/campaigns`, {
      sessionId: options?.sessionId,
      query: options?.includeMetrics ? { include_metrics: 'true' } : undefined
    })
  }

  getAccountPerformance(accountId: string, options: PerformanceRequestOptions): Promise<CampaignMetrics> {
    return this.client.get<CampaignMetrics>(`/api/oauth/meta/accounts/${accountId}/performance`, {
      sessionId: options.sessionId,
      query: {
        start_date: options.startDate,
        end_date: options.endDate
      }
    })
  }

  getAdSets(accountId: string, options?: AdSetRequestOptions): Promise<MetaAdSet[]> {
    return this.client.get<MetaAdSet[]>(`/api/oauth/meta/accounts/${accountId}/adsets`, {
      sessionId: options?.sessionId,
      query: options?.campaignId ? { campaign_id: options.campaignId } : undefined
    })
  }

  getAds(accountId: string, options?: AdRequestOptions): Promise<MetaAd[]> {
    return this.client.get<MetaAd[]>(`/api/oauth/meta/accounts/${accountId}/ads`, {
      sessionId: options?.sessionId,
      query: options?.adSetId ? { adset_id: options.adSetId } : undefined
    })
  }
}
