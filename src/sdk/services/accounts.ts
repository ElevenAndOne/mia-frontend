/**
 * Accounts Service
 * mia.accounts - Account management domain
 */

import type { Transport } from '../internal/transport';
import type {
  Account,
  GA4Property,
  MccAccount,
  GoogleAdsAccount,
  ListAccountsResult,
  SelectAccountResult,
  RawAccountsListResponse,
  RawSelectAccountResponse,
  RawMccAccountsResponse,
} from '../types/accounts';

export class AccountsService {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  /**
   * Get all available accounts for the current user
   *
   * @example
   * ```typescript
   * try {
   *   const { accounts, ga4Properties } = await mia.accounts.list();
   *   setAccounts(accounts);
   * } catch (error) {
   *   if (isMiaSDKError(error)) {
   *     setError('Failed to load accounts');
   *   }
   * }
   * ```
   */
  async list(options?: { refresh?: boolean }): Promise<ListAccountsResult> {
    const url = options?.refresh
      ? '/api/accounts/available?refresh=true'
      : '/api/accounts/available';

    const data = await this.transport.request<RawAccountsListResponse>(url);

    return {
      accounts: (data.accounts || []).map(this.mapAccount),
      ga4Properties: (data.ga4_properties || []).map((p) => ({
        propertyId: p.property_id,
        displayName: p.display_name,
      })),
    };
  }

  /**
   * Select an account for the current session.
   * Returns workspace info if one was auto-created.
   */
  async select(
    accountId: string,
    industry?: string
  ): Promise<SelectAccountResult> {
    const response = await this.transport.request<RawSelectAccountResponse>(
      '/api/accounts/select',
      {
        method: 'POST',
        body: {
          account_id: accountId,
          ...(industry ? { industry } : {}),
        },
      }
    );

    return {
      success: response.success,
      autoCreatedWorkspace: response.workspace
        ? {
            tenantId: response.workspace.tenant_id,
            name: response.workspace.name,
          }
        : undefined,
    };
  }

  /**
   * Link a platform to an account
   */
  async linkPlatform(
    accountId: string,
    platform: 'meta' | 'ga4' | 'brevo' | 'hubspot' | 'mailchimp',
    platformId: string
  ): Promise<void> {
    await this.transport.request('/api/accounts/link-platform', {
      method: 'POST',
      body: {
        account_id: accountId,
        platform,
        platform_id: platformId,
      },
    });
  }

  /**
   * Link Google Ads account
   */
  async linkGoogleAds(
    targetAccountId: string,
    googleAdsCustomerId: string,
    loginCustomerId?: string
  ): Promise<void> {
    await this.transport.request('/api/accounts/link-google', {
      method: 'POST',
      body: {
        target_account_id: targetAccountId,
        google_ads_customer_id: googleAdsCustomerId,
        ...(loginCustomerId ? { login_customer_id: loginCustomerId } : {}),
      },
    });
  }

  /**
   * Get MCC (Manager Customer Center) accounts
   */
  async getMccAccounts(userId: string): Promise<{
    mccAccounts: MccAccount[];
    regularAccounts: GoogleAdsAccount[];
  }> {
    const response = await this.transport.request<RawMccAccountsResponse>(
      `/api/oauth/google/ad-accounts?user_id=${encodeURIComponent(userId)}`
    );

    return {
      mccAccounts: (response.mcc_accounts || []).map((acc) => ({
        customerId: acc.customer_id,
        descriptiveName: acc.descriptive_name,
        accountCount: acc.account_count,
        isManager: acc.manager,
        subAccountIds: acc.sub_account_ids,
      })),
      regularAccounts: (response.regular_accounts || []).map((acc) => ({
        customerId: acc.customer_id,
        descriptiveName: acc.descriptive_name,
        isManager: acc.manager,
        loginCustomerId: acc.login_customer_id,
      })),
    };
  }

  /**
   * Get discovered Google accounts
   */
  async getDiscoveredGoogleAccounts(): Promise<GoogleAdsAccount[]> {
    const response = await this.transport.request<{
      accounts: Array<{
        customer_id: string;
        descriptive_name: string;
        manager: boolean;
        login_customer_id?: string;
      }>;
    }>('/api/google/accounts/discovered');

    return (response.accounts || []).map((acc) => ({
      customerId: acc.customer_id,
      descriptiveName: acc.descriptive_name,
      isManager: acc.manager,
      loginCustomerId: acc.login_customer_id,
    }));
  }

  /**
   * Refresh GA4 properties
   */
  async refreshGA4Properties(): Promise<GA4Property[]> {
    const response = await this.transport.request<{
      ga4_properties: Array<{
        property_id: string;
        display_name: string;
      }>;
    }>('/api/ga4/refresh', { method: 'POST' });

    return (response.ga4_properties || []).map((p) => ({
      propertyId: p.property_id,
      displayName: p.display_name,
    }));
  }

  /**
   * Get platform preferences
   */
  async getPlatformPreferences(): Promise<string[]> {
    const response = await this.transport.request<{
      selected_platforms: string[];
    }>('/api/account/platform-preferences');
    return response.selected_platforms || [];
  }

  /**
   * Save platform preferences
   */
  async savePlatformPreferences(platforms: string[]): Promise<void> {
    await this.transport.request('/api/account/platform-preferences', {
      method: 'PUT',
      body: { selected_platforms: platforms },
    });
  }

  private mapAccount(raw: RawAccountsListResponse['accounts'][0]): Account {
    return {
      id: raw.id,
      name: raw.name,
      displayName: raw.display_name || raw.name,
      googleAdsId: raw.google_ads_id || '',
      ga4PropertyId: raw.ga4_property_id || '',
      metaAdsId: raw.meta_ads_id,
      facebookPageId: raw.facebook_page_id,
      facebookPageName: raw.facebook_page_name,
      brevoApiKey: raw.brevo_api_key,
      brevoAccountName: raw.brevo_account_name,
      hubspotPortalId: raw.hubspot_portal_id,
      mailchimpAccountId: raw.mailchimp_account_id,
      businessType: raw.business_type || '',
      googleAdsAccountType: raw.google_ads_account_type,
      color: raw.color || '',
    };
  }
}
