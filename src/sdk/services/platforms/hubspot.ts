/**
 * HubSpot Service
 * mia.platforms.hubspot - HubSpot CRM integration
 */

import type { Transport } from '../../internal/transport';
import type {
  HubSpotAccount,
  HubSpotAuthUrlResult,
  RawHubSpotAccountResponse,
} from '../../types/platforms';

export class HubSpotService {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  /**
   * Get HubSpot OAuth authentication URL
   */
  async getAuthUrl(tenantId: string): Promise<HubSpotAuthUrlResult> {
    const response = await this.transport.request<{
      auth_url: string;
      state: string;
    }>(`/api/oauth/hubspot/auth-url?tenant_id=${tenantId}`);

    return {
      authUrl: response.auth_url,
      state: response.state,
    };
  }

  /**
   * Disconnect HubSpot integration
   */
  async disconnect(hubspotId?: number): Promise<void> {
    let url = '/api/oauth/hubspot/disconnect';
    if (hubspotId !== undefined) {
      url += `?hubspot_id=${hubspotId}`;
    }
    await this.transport.request(url, { method: 'DELETE' });
  }

  /**
   * Get HubSpot connection status
   */
  async getStatus(): Promise<{
    connected: boolean;
    portalId?: string;
    accountName?: string;
  }> {
    return this.transport.request('/api/oauth/hubspot/status');
  }

  /**
   * Get linked HubSpot accounts
   */
  async getAccounts(): Promise<HubSpotAccount[]> {
    const response =
      await this.transport.request<RawHubSpotAccountResponse[]>(
        '/api/oauth/hubspot/accounts'
      );

    return (response || []).map((acc) => ({
      id: acc.id,
      portalId: acc.portal_id,
      accountName: acc.account_name,
      isPrimary: acc.is_primary,
    }));
  }

  /**
   * Select HubSpot account as primary
   */
  async selectAccount(hubspotId: number): Promise<void> {
    await this.transport.request(
      `/api/oauth/hubspot/select-account?hubspot_id=${hubspotId}`,
      { method: 'POST' }
    );
  }

  /**
   * Link HubSpot portal
   */
  async linkPortal(
    accessToken: string,
    refreshToken: string,
    portalId: string
  ): Promise<void> {
    await this.transport.request('/api/oauth/hubspot/link-portal', {
      method: 'POST',
      body: {
        access_token: accessToken,
        refresh_token: refreshToken,
        portal_id: portalId,
      },
    });
  }

  /**
   * Check if user has HubSpot connected
   */
  async getUserInfo(userId: string): Promise<{
    connected: boolean;
    portalId?: string;
  }> {
    return this.transport.request(
      `/api/oauth/hubspot/user-info?user_id=${encodeURIComponent(userId)}`
    );
  }
}
