/**
 * Session & User Types
 */

export interface User {
  id: string;
  name: string;
  email: string;
  pictureUrl: string;
  hasSeenIntro: boolean;
  onboardingCompleted: boolean;
}

export interface AccountSummary {
  id: string;
  name: string;
  googleAdsId: string | null;
  ga4PropertyId: string | null;
  metaAdsId: string | null;
  selectedMccId: string | null;
}

export interface AuthenticatedPlatforms {
  google: boolean;
  meta: boolean;
}

export interface ConnectedPlatforms {
  google: boolean;
  ga4: boolean;
  meta: boolean;
  facebookOrganic: boolean;
  brevo: boolean;
  hubspot: boolean;
  mailchimp: boolean;
}

export interface SessionData {
  sessionId: string;
  user: User | null;
  isAuthenticated: boolean;
  authenticatedPlatforms: AuthenticatedPlatforms;
  connectedPlatforms: ConnectedPlatforms;
  selectedAccount: AccountSummary | null;
  expiresAt: string | null;
}

export interface RestoreSessionResult {
  success: boolean;
  session: SessionData | null;
  isNewSession: boolean;
}

export interface ValidateSessionResult {
  valid: boolean;
  session: SessionData | null;
}

/**
 * Raw API response types (internal use)
 */
export interface RawSessionValidationResponse {
  valid: boolean;
  user?: {
    name: string;
    email: string;
    picture_url?: string;
    user_id: string;
    has_seen_intro?: boolean;
    onboarding_completed?: boolean;
  };
  selected_account?: {
    id: string;
    name: string;
    google_ads_id?: string;
    ga4_property_id?: string;
    meta_ads_id?: string;
    selected_mcc_id?: string;
    business_type?: string;
  };
  user_authenticated?: {
    google: boolean;
    meta: boolean;
  };
  platforms?: {
    google?: boolean;
    meta?: boolean;
    ga4?: boolean;
    brevo?: boolean;
    hubspot?: boolean;
    mailchimp?: boolean;
  };
  expires_at?: string;
}
