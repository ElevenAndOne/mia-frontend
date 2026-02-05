/**
 * Platform Types
 */

export type PlatformId =
  | 'google'
  | 'ga4'
  | 'meta'
  | 'facebook_organic'
  | 'brevo'
  | 'hubspot'
  | 'mailchimp';

export interface PlatformStatus {
  connected: boolean;
  linked: boolean;
  lastSynced?: string;
}

export interface AllPlatformStatuses {
  google: PlatformStatus;
  ga4: PlatformStatus;
  meta: PlatformStatus;
  facebookOrganic: PlatformStatus;
  brevo: PlatformStatus;
  hubspot: PlatformStatus;
  mailchimp: PlatformStatus;
}

// Brevo types
export interface BrevoAccount {
  id: number;
  accountName: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface BrevoConnectResult {
  success: boolean;
  accountName?: string;
}

// HubSpot types
export interface HubSpotAccount {
  id: number;
  portalId: string;
  accountName: string;
  isPrimary: boolean;
}

export interface HubSpotAuthUrlResult {
  authUrl: string;
  state: string;
}

// Mailchimp types
export interface MailchimpAccount {
  id: number;
  accountId: string;
  accountName: string;
  isPrimary: boolean;
}

export interface MailchimpAuthUrlResult {
  authUrl: string;
  state: string;
}

// Facebook Page types
export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  fanCount: number;
  link?: string;
  accessToken?: string;
}

/**
 * Raw API response types (internal use)
 */
export interface RawBrevoAccountResponse {
  id: number;
  account_name: string;
  is_primary: boolean;
  created_at: string;
}

export interface RawHubSpotAccountResponse {
  id: number;
  portal_id: string;
  account_name: string;
  is_primary: boolean;
}

export interface RawMailchimpAccountResponse {
  id: number;
  mailchimp_account_id: string;
  mailchimp_account_name: string;
  is_primary: boolean;
}

export interface RawFacebookPageResponse {
  id: string;
  name: string;
  category: string;
  fan_count: number;
  link?: string;
  access_token?: string;
}

export interface RawPlatformStatusResponse {
  platforms: Record<string, boolean>;
}
