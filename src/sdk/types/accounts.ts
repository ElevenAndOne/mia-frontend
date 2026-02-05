/**
 * Account Types
 */

export interface Account {
  id: string;
  name: string;
  displayName: string;
  googleAdsId: string;
  ga4PropertyId: string;
  metaAdsId?: string;
  facebookPageId?: string;
  facebookPageName?: string;
  brevoApiKey?: string;
  brevoAccountName?: string;
  hubspotPortalId?: string;
  mailchimpAccountId?: string;
  businessType: string;
  googleAdsAccountType?: string;
  color: string;
}

export interface MccAccount {
  customerId: string;
  descriptiveName: string;
  accountCount: number;
  isManager: boolean;
  subAccountIds?: string[];
}

export interface GoogleAdsAccount {
  customerId: string;
  descriptiveName: string;
  isManager: boolean;
  loginCustomerId?: string;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  accountId: string;
  currency: string;
  timezoneName: string;
  accountStatus: number;
}

export interface GA4Property {
  propertyId: string;
  displayName: string;
}

export interface LinkedGA4Property extends GA4Property {
  isPrimary: boolean;
  sortOrder: number;
}

export interface SelectAccountResult {
  success: boolean;
  autoCreatedWorkspace?: {
    tenantId: string;
    name: string;
  };
}

export interface ListAccountsResult {
  accounts: Account[];
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
  workspace?: {
    tenant_id: string;
    name: string;
    auto_created?: boolean;
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
