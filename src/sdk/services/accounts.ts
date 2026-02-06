/**
 * Accounts Service
 *
 * Manages advertising accounts across all connected platforms. An "account" in MIA
 * represents a unified view that can link multiple platform accounts (Google Ads,
 * Meta Ads, GA4, etc.) together.
 *
 * **Namespace:** `mia.accounts`
 *
 * **Key Concepts:**
 * - Accounts aggregate data from multiple advertising platforms
 * - Each account can have linked Google Ads, Meta Ads, GA4, and other platform IDs
 * - Selecting an account sets the context for insights and analytics
 *
 * @example
 * ```typescript
 * // List and select an account
 * const { accounts } = await mia.accounts.list();
 * await mia.accounts.select(accounts[0].id, 'ecommerce');
 *
 * // Link additional platforms
 * await mia.accounts.linkPlatform(accountId, 'meta', 'act_123');
 * ```
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
   * List all available accounts for the current user.
   *
   * Returns accounts with their linked platforms and available GA4 properties.
   * Use `{ refresh: true }` to force a fresh fetch from platform APIs.
   *
   * @param options - Optional configuration
   * @param options.refresh - Force refresh from platform APIs (slower but ensures fresh data)
   * @returns Promise resolving to accounts and GA4 properties
   *
   * @example
   * ```typescript
   * // Basic listing
   * const { accounts, ga4Properties } = await mia.accounts.list();
   *
   * // Force refresh from APIs
   * const { accounts: fresh } = await mia.accounts.list({ refresh: true });
   *
   * // Display accounts
   * accounts.forEach(acc => {
   *   console.log(acc.displayName, acc.googleAdsId, acc.metaAdsId);
   * });
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
   *
   * This sets the active account context for all subsequent operations including
   * insights generation and analytics. If no workspace exists for this account,
   * one may be auto-created.
   *
   * @param accountId - The account ID to select
   * @param industry - Optional industry classification (e.g., 'ecommerce', 'saas')
   * @returns Promise resolving to selection result with optional workspace info
   *
   * @example
   * ```typescript
   * const result = await mia.accounts.select(accountId, 'ecommerce');
   *
   * if (result.autoCreatedWorkspace) {
   *   console.log('Workspace created:', result.autoCreatedWorkspace.name);
   *   await mia.workspaces.switch(result.autoCreatedWorkspace.tenantId);
   * }
   * ```
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
   * Link a platform account to a MIA account.
   *
   * Associates a platform-specific account (Meta, GA4, etc.) with the specified
   * MIA account, enabling unified analytics across platforms.
   *
   * @param accountId - The MIA account ID to link to
   * @param platform - The platform type ('meta' | 'ga4' | 'brevo' | 'hubspot' | 'mailchimp')
   * @param platformId - The platform-specific account ID
   *
   * @example
   * ```typescript
   * // Link Meta Ads account
   * const metaAccounts = await mia.auth.meta.getAvailableAccounts();
   * await mia.accounts.linkPlatform(accountId, 'meta', metaAccounts[0].id);
   *
   * // Link GA4 property
   * const { ga4Properties } = await mia.accounts.list();
   * await mia.accounts.linkPlatform(accountId, 'ga4', ga4Properties[0].propertyId);
   * ```
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
   * Link a Google Ads account to a MIA account.
   *
   * For accounts accessed via MCC (Manager Customer Center), provide the
   * loginCustomerId to specify which MCC should be used for API access.
   *
   * @param targetAccountId - The MIA account ID to link to
   * @param googleAdsCustomerId - The Google Ads customer ID (format: '123-456-7890')
   * @param loginCustomerId - Optional MCC customer ID for manager account access
   *
   * @example
   * ```typescript
   * // Link direct account
   * await mia.accounts.linkGoogleAds(accountId, '123-456-7890');
   *
   * // Link account via MCC
   * await mia.accounts.linkGoogleAds(
   *   accountId,
   *   '123-456-7890',      // Target account
   *   '098-765-4321'       // MCC login ID
   * );
   * ```
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
   * Get Google Ads MCC (Manager Customer Center) and regular accounts.
   *
   * Returns all Google Ads accounts accessible by the user, separated into
   * MCC (manager) accounts and regular (client) accounts.
   *
   * @param userId - The user ID to fetch accounts for
   * @returns Promise resolving to MCC and regular accounts
   *
   * @example
   * ```typescript
   * const userId = mia.session.getUserId();
   * const { mccAccounts, regularAccounts } = await mia.accounts.getMccAccounts(userId);
   *
   * // MCC accounts can manage multiple sub-accounts
   * mccAccounts.forEach(mcc => {
   *   console.log(mcc.descriptiveName, 'manages', mcc.accountCount, 'accounts');
   * });
   * ```
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
   * Get automatically discovered Google Ads accounts.
   *
   * Returns accounts that have been discovered through the Google Ads API
   * but may not yet be linked to a MIA account.
   *
   * @returns Promise resolving to array of discovered Google Ads accounts
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
   * Refresh the list of available GA4 properties.
   *
   * Forces a fresh fetch from the Google Analytics API to discover
   * any new GA4 properties the user has access to.
   *
   * @returns Promise resolving to updated list of GA4 properties
   *
   * @example
   * ```typescript
   * const properties = await mia.accounts.refreshGA4Properties();
   * console.log('Found', properties.length, 'GA4 properties');
   * ```
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
   * Get the user's platform preferences.
   *
   * Returns the list of platforms the user has selected for their dashboard
   * and insights views.
   *
   * @returns Promise resolving to array of platform IDs
   *
   * @example
   * ```typescript
   * const platforms = await mia.accounts.getPlatformPreferences();
   * // ['google_ads', 'meta', 'ga4']
   * ```
   */
  async getPlatformPreferences(): Promise<string[]> {
    const response = await this.transport.request<{
      selected_platforms: string[];
    }>('/api/account/platform-preferences');
    return response.selected_platforms || [];
  }

  /**
   * Save the user's platform preferences.
   *
   * Updates which platforms should be included in dashboards and insights.
   *
   * @param platforms - Array of platform IDs to include
   *
   * @example
   * ```typescript
   * await mia.accounts.savePlatformPreferences(['google_ads', 'meta', 'ga4']);
   * ```
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
