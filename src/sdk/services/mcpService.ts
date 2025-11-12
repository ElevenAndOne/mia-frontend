import { BaseService, SessionOptions } from './baseService'
import type { McpGa4PropertiesResponse, McpGoogleAdsResponse } from '../types'

export class McpService extends BaseService {
  getGoogleAdsAccounts(options?: SessionOptions): Promise<McpGoogleAdsResponse> {
    return this.client.post<McpGoogleAdsResponse>(
      '/api/mcp/google-ads-accounts',
      { tool: 'get_google_ads_accounts' },
      { sessionId: options?.sessionId }
    )
  }

  getGa4Properties(options?: SessionOptions): Promise<McpGa4PropertiesResponse> {
    return this.client.post<McpGa4PropertiesResponse>(
      '/api/mcp/ga4-properties',
      { tool: 'get_ga4_properties' },
      { sessionId: options?.sessionId }
    )
  }
}
