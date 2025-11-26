/**
 * Third-party Integrations Service
 */

import { APIClient } from '../client'
import type { HubSpotAccountsResponse, BrevoConnectionRequest, BrevoStatusResponse, APIResponse } from '../types'

export class IntegrationsService {
  private readonly client: APIClient

  constructor(client: APIClient) {
    this.client = client
  }

  // ============= HubSpot =============

  /**
   * Get HubSpot accounts
   */
  async getHubSpotAccounts(): Promise<APIResponse<HubSpotAccountsResponse>> {
    return this.client.get('/api/oauth/hubspot/accounts', {
      params: {
        session_id: this.client.getSessionId() || 'default'
      }
    })
  }

  // ============= Brevo =============

  /**
   * Save Brevo API key
   */
  async saveBrevoApiKey(request: BrevoConnectionRequest): Promise<APIResponse<unknown>> {
    return this.client.post('/api/oauth/brevo/save-api-key', {
      ...request,
      session_id: request.session_id || this.client.getSessionId()
    })
  }

  /**
   * Connect to Brevo
   */
  async connectBrevo(apiKey: string): Promise<APIResponse<unknown>> {
    return this.client.post('/api/brevo/connect', {
      api_key: apiKey,
      session_id: this.client.getSessionId()
    })
  }

  /**
   * Check Brevo connection status
   */
  async getBrevoStatus(): Promise<APIResponse<BrevoStatusResponse>> {
    return this.client.get('/api/oauth/brevo/status', {
      params: {
        session_id: this.client.getSessionId() || 'default'
      }
    })
  }

  // ============= Figma =============

  /**
   * Get Figma OAuth URL
   */
  async getFigmaAuthUrl(): Promise<APIResponse<{ auth_url: string }>> {
    return this.client.get('/api/oauth/figma/auth-url')
  }

  /**
   * Check Figma connection status
   */
  async getFigmaStatus(): Promise<APIResponse<{ authenticated: boolean }>> {
    return this.client.get('/api/oauth/figma/status', {
      params: {
        session_id: this.client.getSessionId() || 'default'
      }
    })
  }
}
