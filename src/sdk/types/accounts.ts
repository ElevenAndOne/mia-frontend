/**
 * Account Types
 *
 * Types for managing advertising accounts and their linked platform accounts.
 */

/**
 * A MIA account that aggregates data from multiple advertising platforms.
 *
 * Each account can have linked Google Ads, Meta Ads, GA4, and other
 * platform accounts for unified analytics.
 *
 * @example
 * ```typescript
 * const { accounts } = await mia.accounts.list();
 * accounts.forEach(acc => {
 *   console.log(acc.displayName);
 *   if (acc.googleAdsId) console.log('Google Ads:', acc.googleAdsId);
 *   if (acc.metaAdsId) console.log('Meta Ads:', acc.metaAdsId);
 * });
 * ```
 */
export interface Account {
  /** Unique account identifier */
  id: string;
  /** Internal name */
  name: string;
  /** User-facing display name */
  displayName: string;
  /** Linked Google Ads customer ID */
  googleAdsId: string;
  /** Linked GA4 property ID */
  ga4PropertyId: string;
  /** Linked Meta Ads account ID */
  metaAdsId?: string;
  /** Linked Facebook page ID */
  facebookPageId?: string;
  /** Linked Facebook page name */
  facebookPageName?: string;
  /** Brevo API key (if connected) */
  brevoApiKey?: string;
  /** Brevo account name */
  brevoAccountName?: string;
  /** HubSpot portal ID */
  hubspotPortalId?: string;
  /** Mailchimp account ID */
  mailchimpAccountId?: string;
  /** Business type/industry classification */
  businessType: string;
  /** Google Ads account type (regular/MCC) */
  googleAdsAccountType?: string;
  /** UI color for this account */
  color: string;
}

/**
 * Google Ads MCC (Manager Customer Center) account.
 *
 * MCCs can manage multiple sub-accounts and provide aggregated access.
 */
export interface MccAccount {
  /** MCC customer ID (format: '123-456-7890') */
  customerId: string;
  /** Account name */
  descriptiveName: string;
  /** Number of managed sub-accounts */
  accountCount: number;
  /** Whether this is a manager account */
  isManager: boolean;
  /** IDs of managed sub-accounts */
  subAccountIds?: string[];
}

/**
 * Individual Google Ads account.
 */
export interface GoogleAdsAccount {
  /** Customer ID (format: '123-456-7890') */
  customerId: string;
  /** Account name */
  descriptiveName: string;
  /** Whether this is a manager account */
  isManager: boolean;
  /** MCC customer ID used to access this account */
  loginCustomerId?: string;
}

/**
 * Meta (Facebook) Ads account.
 */
export interface MetaAdAccount {
  /** Internal ID */
  id: string;
  /** Account name */
  name: string;
  /** Meta account ID (format: 'act_123456789') */
  accountId: string;
  /** Account currency (e.g., 'USD') */
  currency: string;
  /** Timezone name (e.g., 'America/Los_Angeles') */
  timezoneName: string;
  /** Account status code */
  accountStatus: number;
}

/**
 * Google Analytics 4 property.
 */
export interface GA4Property {
  /** Property ID */
  propertyId: string;
  /** Property display name */
  displayName: string;
}

/**
 * GA4 property linked to an account.
 */
export interface LinkedGA4Property extends GA4Property {
  /** Whether this is the primary GA4 property */
  isPrimary: boolean;
  /** Display order */
  sortOrder: number;
}

/**
 * Result from selecting an account.
 */
export interface SelectAccountResult {
  /** Whether selection succeeded */
  success: boolean;
  /** Whether a workspace was created during selection */
  workspaceCreated: boolean;
  /** Active tenant/workspace after selection */
  activeTenant?: {
    tenantId: string;
    name: string;
    slug?: string;
  };
  /** Workspace info if one was auto-created */
  autoCreatedWorkspace?: {
    tenantId: string;
    name: string;
  };
}

/**
 * Result from listing accounts.
 */
export interface ListAccountsResult {
  /** Available accounts */
  accounts: Account[];
  /** Available GA4 properties (not yet linked) */
  ga4Properties: GA4Property[];
}

/**
 * Raw API response types (internal use)
 */
export interface RawAccountResponse {
  id: string;
  name: string;
  google_ads_id?: string;
  ga4_property_id?: string;
  meta_ads_id?: string;
  facebook_page_id?: string;
  facebook_page_name?: string;
  brevo_api_key?: string;
  brevo_account_name?: string;
  hubspot_portal_id?: string;
  mailchimp_account_id?: string;
  business_type?: string;
  color?: string;
  display_name?: string;
  google_ads_account_type?: string;
}

export interface RawAccountsListResponse {
  accounts: RawAccountResponse[];
  ga4_properties?: Array<{
    property_id: string;
    display_name: string;
  }>;
}

export interface RawSelectAccountResponse {
  success: boolean;
  workspace_created?: boolean;
  active_tenant?: {
    tenant_id: string;
    name: string;
    slug?: string;
  };
  workspace?: {
    tenant_id: string;
    name: string;
    auto_created?: boolean;
    slug?: string;
  };
}

export interface RawMccAccountsResponse {
  mcc_accounts: Array<{
    customer_id: string;
    descriptive_name: string;
    account_count: number;
    manager: boolean;
    sub_account_ids?: string[];
  }>;
  regular_accounts: Array<{
    customer_id: string;
    descriptive_name: string;
    manager: boolean;
    login_customer_id?: string;
  }>;
}
