/**
 * Mailchimp Service
 * mia.platforms.mailchimp - Mailchimp email marketing integration
 */

import type { Transport } from '../../internal/transport';
import type {
  MailchimpAccount,
  MailchimpAuthUrlResult,
  RawMailchimpAccountResponse,
} from '../../types/platforms';

export class MailchimpService {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  /**
   * Get Mailchimp OAuth authentication URL
   */
  async getAuthUrl(tenantId: string): Promise<MailchimpAuthUrlResult> {
    const response = await this.transport.request<{
      auth_url: string;
      state: string;
    }>(`/api/oauth/mailchimp/auth-url?tenant_id=${tenantId}`);

    return {
      authUrl: response.auth_url,
      state: response.state,
    };
  }

  /**
   * Disconnect Mailchimp integration
   */
  async disconnect(mailchimpId?: number): Promise<void> {
    let url = '/api/oauth/mailchimp/disconnect';
    if (mailchimpId !== undefined) {
      url += `?mailchimp_id=${mailchimpId}`;
    }
    await this.transport.request(url, { method: 'DELETE' });
  }

  /**
   * Get Mailchimp connection status
   */
  async getStatus(): Promise<{
    connected: boolean;
    accountId?: string;
    accountName?: string;
  }> {
    return this.transport.request('/api/oauth/mailchimp/status');
  }

  /**
   * Get all Mailchimp accounts
   */
  async getAccounts(): Promise<MailchimpAccount[]> {
    const response =
      await this.transport.request<RawMailchimpAccountResponse[]>(
        '/api/oauth/mailchimp/accounts'
      );

    return (response || []).map((acc) => ({
      id: acc.id,
      accountId: acc.mailchimp_account_id,
      accountName: acc.mailchimp_account_name,
      isPrimary: acc.is_primary,
    }));
  }

  /**
   * Set primary Mailchimp account
   */
  async setPrimary(mailchimpId: number): Promise<void> {
    await this.transport.request(
      `/api/oauth/mailchimp/set-primary?mailchimp_id=${mailchimpId}`,
      { method: 'POST' }
    );
  }

  /**
   * Delete specific Mailchimp account
   */
  async deleteAccount(mailchimpId: number): Promise<void> {
    await this.transport.request(
      `/api/oauth/mailchimp/accounts/${mailchimpId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Check if user has Mailchimp connected
   */
  async getUserInfo(userId: string): Promise<{
    connected: boolean;
    accountId?: string;
  }> {
    return this.transport.request(
      `/api/oauth/mailchimp/user-info?user_id=${encodeURIComponent(userId)}`
    );
  }
}
