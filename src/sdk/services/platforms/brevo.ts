/**
 * Brevo Service
 * mia.platforms.brevo - Brevo email marketing integration
 */

import type { Transport } from '../../internal/transport';
import type {
  BrevoAccount,
  BrevoConnectResult,
  RawBrevoAccountResponse,
} from '../../types/platforms';

export class BrevoService {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  /**
   * Connect Brevo with API key
   */
  async connect(apiKey: string): Promise<BrevoConnectResult> {
    const response = await this.transport.request<{
      success: boolean;
      account_name?: string;
    }>('/api/oauth/brevo/save-api-key', {
      method: 'POST',
      body: { api_key: apiKey },
    });

    return {
      success: response.success,
      accountName: response.account_name,
    };
  }

  /**
   * Disconnect Brevo integration
   */
  async disconnect(brevoId?: number): Promise<void> {
    let url = '/api/oauth/brevo/disconnect';
    if (brevoId !== undefined) {
      url += `?brevo_id=${brevoId}`;
    }
    await this.transport.request(url, { method: 'DELETE' });
  }

  /**
   * Get Brevo connection status
   */
  async getStatus(): Promise<{
    connected: boolean;
    accountName?: string;
  }> {
    return this.transport.request('/api/oauth/brevo/status');
  }

  /**
   * Get all Brevo accounts
   */
  async getAccounts(): Promise<BrevoAccount[]> {
    const response =
      await this.transport.request<RawBrevoAccountResponse[]>(
        '/api/oauth/brevo/accounts'
      );

    return (response || []).map((acc) => ({
      id: acc.id,
      accountName: acc.account_name,
      isPrimary: acc.is_primary,
      createdAt: acc.created_at,
    }));
  }

  /**
   * Select a Brevo account as primary
   */
  async selectAccount(brevoAccountId: number): Promise<void> {
    await this.transport.request('/api/oauth/brevo/select-account', {
      method: 'POST',
      body: { brevo_account_id: brevoAccountId },
    });
  }
}
