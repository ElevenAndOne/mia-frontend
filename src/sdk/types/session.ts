/**
 * Session & User Types
 *
 * Core types for session management and user authentication state.
 */

/**
 * Authenticated user information.
 *
 * @example
 * ```typescript
 * if (session.user) {
 *   console.log(`Hello, ${session.user.name}`);
 *   console.log(`Email: ${session.user.email}`);
 * }
 * ```
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** Display name */
  name: string;
  /** Email address */
  email: string;
  /** Profile picture URL */
  pictureUrl: string;
  /** Whether user has seen the intro/welcome screen */
  hasSeenIntro: boolean;
  /** Whether user has completed onboarding */
  onboardingCompleted: boolean;
}

/**
 * Summary of the currently selected account.
 *
 * Contains IDs for all linked platform accounts.
 */
export interface AccountSummary {
  /** MIA account ID */
  id: string;
  /** Account display name */
  name: string;
  /** Linked Google Ads customer ID (format: '123-456-7890') */
  googleAdsId: string | null;
  /** Linked GA4 property ID */
  ga4PropertyId: string | null;
  /** Linked Meta Ads account ID (format: 'act_123') */
  metaAdsId: string | null;
  /** Selected MCC customer ID for Google Ads access */
  selectedMccId: string | null;
}

/**
 * OAuth authentication status for identity providers.
 *
 * Indicates which providers the user has authenticated with.
 */
export interface AuthenticatedPlatforms {
  /** Google OAuth completed */
  google: boolean;
  /** Meta/Facebook OAuth completed */
  meta: boolean;
}

/**
 * Connection status for all supported platforms.
 *
 * A platform is "connected" when it has valid credentials AND
 * is linked to the current account.
 */
export interface ConnectedPlatforms {
  /** Google Ads connected */
  google: boolean;
  /** Google Analytics 4 connected */
  ga4: boolean;
  /** Meta Ads connected */
  meta: boolean;
  /** Facebook organic (pages) connected */
  facebookOrganic: boolean;
  /** Brevo email marketing connected */
  brevo: boolean;
  /** HubSpot CRM connected */
  hubspot: boolean;
  /** Mailchimp email marketing connected */
  mailchimp: boolean;
}

export type SessionNextAction =
  | 'AUTH_REQUIRED'
  | 'ACCEPT_INVITE'
  | 'CREATE_WORKSPACE'
  | 'SELECT_ACCOUNT'
  | 'ONBOARDING'
  | 'HOME';

export interface SessionMembership {
  tenantId: string;
  name: string;
  slug: string;
  role: string;
  onboardingCompleted: boolean;
  connectedPlatforms: string[];
}

export interface SessionPendingInvite {
  inviteId: string;
  tenantId: string;
  tenantName: string;
  role: string;
  invitedBy?: string;
  expiresAt: string;
}

export interface SessionInviteContext {
  pendingInvitesCount: number;
  pendingInvites: SessionPendingInvite[];
}

/**
 * Complete session state.
 *
 * Contains all information about the current user session including
 * authentication status, user info, and connected platforms.
 *
 * @example
 * ```typescript
 * const { session } = await mia.session.restore();
 *
 * if (session.isAuthenticated) {
 *   console.log('User:', session.user);
 *   console.log('Platforms:', session.connectedPlatforms);
 * }
 * ```
 */
export interface SessionData {
  /** Unique session identifier */
  sessionId: string;
  /** Authenticated user (null if not authenticated) */
  user: User | null;
  /** Whether user is authenticated (has valid OAuth) */
  isAuthenticated: boolean;
  /** OAuth status by provider */
  authenticatedPlatforms: AuthenticatedPlatforms;
  /** Platform connection status */
  connectedPlatforms: ConnectedPlatforms;
  /** Currently selected account */
  selectedAccount: AccountSummary | null;
  /** Session expiration timestamp (ISO 8601) */
  expiresAt: string | null;
  /** Backend-determined next routing action */
  nextAction: SessionNextAction;
  /** Active tenant/workspace ID for this session */
  activeTenantId: string | null;
  /** Whether account selection is required before proceeding */
  requiresAccountSelection: boolean;
  /** Workspace memberships for this user */
  memberships: SessionMembership[];
  /** Pending invite context for deterministic invite routing */
  inviteContext: SessionInviteContext | null;
}

/**
 * Result from session restoration.
 *
 * @example
 * ```typescript
 * const { success, session, isNewSession } = await mia.session.restore();
 * ```
 */
export interface RestoreSessionResult {
  /** Whether restoration succeeded */
  success: boolean;
  /** Session data (always present, may be unauthenticated) */
  session: SessionData | null;
  /** Whether this is a newly created session */
  isNewSession: boolean;
}

/**
 * Result from session validation.
 */
export interface ValidateSessionResult {
  /** Whether session is valid */
  valid: boolean;
  /** Session data if valid */
  session: SessionData | null;
}

/**
 * Raw API response types (internal use)
 */
export interface RawSessionValidationResponse {
  valid: boolean;
  message?: string;
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
    facebook_organic?: boolean;
    brevo?: boolean;
    hubspot?: boolean;
    mailchimp?: boolean;
  };
  expires_at?: string;
  next_action?: SessionNextAction;
  active_tenant_id?: string | null;
  requires_account_selection?: boolean;
  memberships?: Array<{
    tenant_id: string;
    name: string;
    slug: string;
    role: string;
    onboarding_completed: boolean;
    connected_platforms?: string[];
  }>;
  invite_context?: {
    pending_invites_count: number;
    pending_invites: Array<{
      invite_id: string;
      tenant_id: string;
      tenant_name: string;
      role: string;
      invited_by?: string;
      expires_at: string;
    }>;
  } | null;
  session_version?: string;
}
