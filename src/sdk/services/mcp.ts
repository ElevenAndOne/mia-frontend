/**
 * MCP (Model Context Protocol) Service
 */

import { APIClient } from '../client'
import { MCPToolRequest, MCPToolResponse, APIResponse } from '../types'

export class MCPService {
  constructor(private client: APIClient) {}

  /**
   * Execute a generic MCP tool
   */
  async executeTool<T = unknown>(request: MCPToolRequest): Promise<APIResponse<MCPToolResponse<T>>> {
    return this.client.post('/api/mcp/execute', request)
  }

  /**
   * Get Google Ads accounts via MCP
   */
  async getGoogleAdsAccounts(): Promise<APIResponse<MCPToolResponse>> {
    return this.client.post('/api/mcp/google-ads-accounts', {
      tool: 'get_google_ads_accounts'
    })
  }

  /**
   * Get GA4 properties via MCP
   */
  async getGA4Properties(): Promise<APIResponse<MCPToolResponse>> {
    return this.client.post('/api/mcp/ga4-properties', {
      tool: 'get_ga4_properties'
    })
  }
}
