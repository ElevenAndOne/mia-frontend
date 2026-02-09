/**
 * Session Service
 *
 * Manages user sessions including creation, restoration, validation, and cleanup.
 * This is the foundational service that other services depend on for authentication state.
 *
 * **Namespace:** `mia.session`
 *
 * **Key Concepts:**
 * - Sessions are identified by a unique session ID stored in the configured storage backend
 * - Session validation happens server-side; the SDK caches the result
 * - The `restore()` method is the primary entry point and should be called on app initialization
 *
 * @example
 * ```typescript
 * // On app load
 * const { success, session, isNewSession } = await mia.session.restore();
 *
 * if (session?.isAuthenticated) {
 *   setUser(session.user);
 *   setConnectedPlatforms(session.connectedPlatforms);
 * }
 * ```
 */

import type { Transport } from '../internal/transport';
import type { StorageAdapter } from '../internal/storage';
import type {
  SessionData,
  RestoreSessionResult,
  User,
  AccountSummary,
  RawSessionValidationResponse,
} from '../types/session';
import { generateSessionId } from '../utils/session-id';

export class SessionService {
  private transport: Transport;
  private storage: StorageAdapter;

  constructor(transport: Transport, storage: StorageAdapter) {
    this.transport = transport;
    this.storage = storage;
  }

  /**
   * Restore session from storage or create a new one.
   *
   * This is the **primary entry point** that should be called when your app initializes.
   * It checks for an existing session, validates it with the server, and returns
   * complete session data including user info and connected platforms.
   *
   * @returns Promise resolving to `{ success, session, isNewSession }`
   *
   * @example
   * ```typescript
   * const { success, session, isNewSession } = await mia.session.restore();
   *
   * if (session?.isAuthenticated) {
   *   console.log('Welcome back,', session.user.name);
   * }
   *
   * if (isNewSession) {
   *   showOnboarding();
   * }
   * ```
   */
  async restore(): Promise<RestoreSessionResult> {
    let sessionId = this.storage.getSessionId();
    let isNewSession = false;

    // Generate new session if none exists
    if (!sessionId) {
      sessionId = generateSessionId();
      this.storage.setSessionId(sessionId);
      isNewSession = true;
    }

    try {
      const data = await this.transport.request<RawSessionValidationResponse>(
        `/api/session/bootstrap?session_id=${sessionId}`,
        { skipAuth: true }
      );

      if (!data.valid || !data.user) {
        // Invalid session - create new one
        const newSessionId = generateSessionId();
        this.storage.setSessionId(newSessionId);
        return {
          success: true,
          session: this.buildSessionData(newSessionId, null),
          isNewSession: true,
        };
      }

      // Store user ID for later use
      if (data.user.user_id) {
        this.storage.setUserId(data.user.user_id);
      }

      return {
        success: true,
        session: this.buildSessionData(sessionId, data),
        isNewSession,
      };
    } catch {
      // On error, still return session data with new ID
      const fallbackId = generateSessionId();
      this.storage.setSessionId(fallbackId);
      return {
        success: false,
        session: this.buildSessionData(fallbackId, null),
        isNewSession: true,
      };
    }
  }

  /**
   * Validate the current session with the server.
   *
   * Unlike `restore()`, this method does not create a new session if validation fails.
   * Use this for periodic session checks or when you need to verify the session is still valid.
   *
   * @returns Promise resolving to SessionData if valid, null otherwise
   *
   * @example
   * ```typescript
   * const session = await mia.session.validate();
   * if (!session) {
   *   // Session is invalid or expired
   *   redirectToLogin();
   * }
   * ```
   */
  async validate(): Promise<SessionData | null> {
    const sessionId = this.storage.getSessionId();
    if (!sessionId) return null;

    const data = await this.transport.request<RawSessionValidationResponse>(
      `/api/session/bootstrap?session_id=${sessionId}`,
      { skipAuth: true }
    );

    if (!data.valid) return null;

    return this.buildSessionData(sessionId, data);
  }

  /**
   * Get the current session ID from storage.
   *
   * @returns The session ID string or null if no session exists
   *
   * @example
   * ```typescript
   * const sessionId = mia.session.getSessionId();
   * if (sessionId) {
   *   console.log('Current session:', sessionId);
   * }
   * ```
   */
  getSessionId(): string | null {
    return this.storage.getSessionId();
  }

  /**
   * Get the current user ID from storage.
   *
   * The user ID is stored after successful authentication and persists across sessions.
   *
   * @returns The user ID string or null if no user is authenticated
   *
   * @example
   * ```typescript
   * const userId = mia.session.getUserId();
   * if (userId) {
   *   const { mccAccounts } = await mia.auth.google.getAdAccounts(userId);
   * }
   * ```
   */
  getUserId(): string | null {
    return this.storage.getUserId();
  }

  /**
   * Create a new session with a fresh session ID.
   *
   * This generates a new UUID-based session ID and stores it. Use this when you need
   * to explicitly start a fresh session without validation.
   *
   * @returns The newly generated session ID
   *
   * @example
   * ```typescript
   * const newSessionId = mia.session.createNew();
   * console.log('New session created:', newSessionId);
   * ```
   */
  createNew(): string {
    const sessionId = generateSessionId();
    this.storage.setSessionId(sessionId);
    return sessionId;
  }

  /**
   * Clear the current session (logout).
   *
   * This removes all session data from storage including session ID and user ID.
   * Call this when the user explicitly logs out.
   *
   * @example
   * ```typescript
   * async function handleLogout() {
   *   await mia.auth.google.logout();  // Server-side logout
   *   mia.session.clear();              // Client-side cleanup
   *   redirectToLogin();
   * }
   * ```
   */
  clear(): void {
    this.storage.clearSession();
  }

  /**
   * Select an MCC (Manager Customer Center) account for Google Ads operations.
   *
   * When a user has access to multiple Google Ads accounts via an MCC,
   * use this method to specify which MCC should be used for subsequent operations.
   *
   * @param mccId - The MCC customer ID (format: '123-456-7890')
   *
   * @example
   * ```typescript
   * // Get available MCCs
   * const { mccAccounts } = await mia.auth.google.getAdAccounts(userId);
   *
   * // Select an MCC
   * await mia.session.selectMcc(mccAccounts[0].customerId);
   * ```
   */
  async selectMcc(mccId: string): Promise<void> {
    const sessionId = this.storage.getSessionId();
    await this.transport.request('/api/session/select-mcc', {
      method: 'POST',
      body: { session_id: sessionId, mcc_id: mccId },
    });
  }

  /**
   * Synchronize accounts with the backend.
   *
   * This validates database entries against actual platform API data to ensure
   * consistency. Useful after connecting new platforms or when account data
   * may be out of sync.
   *
   * @example
   * ```typescript
   * // After connecting a new platform
   * await mia.auth.google.connect();
   * await mia.session.syncAccounts();
   * ```
   */
  async syncAccounts(): Promise<void> {
    const sessionId = this.storage.getSessionId();
    await this.transport.request(`/api/accounts/sync?session_id=${sessionId}`, {
      method: 'POST',
    });
  }

  /**
   * Get account synchronization status (for debugging).
   *
   * Returns detailed information about the sync state of connected accounts.
   *
   * @returns Promise resolving to sync status details
   */
  async getSyncStatus(): Promise<unknown> {
    const sessionId = this.storage.getSessionId();
    return this.transport.request(
      `/api/accounts/sync-status?session_id=${sessionId}`
    );
  }

  private buildSessionData(
    sessionId: string,
    data: RawSessionValidationResponse | null
  ): SessionData {
    if (!data || !data.valid) {
      return {
        sessionId,
        user: null,
        isAuthenticated: false,
        authenticatedPlatforms: { google: false, meta: false },
        connectedPlatforms: {
          google: false,
          ga4: false,
          meta: false,
          facebookOrganic: false,
          brevo: false,
          hubspot: false,
          mailchimp: false,
        },
        selectedAccount: null,
        expiresAt: null,
        nextAction: 'AUTH_REQUIRED',
        activeTenantId: null,
        requiresAccountSelection: false,
        memberships: [],
        inviteContext: null,
      };
    }

    const user: User | null = data.user
      ? {
          id: data.user.user_id,
          name: data.user.name,
          email: data.user.email,
          pictureUrl: data.user.picture_url || '',
          hasSeenIntro: data.user.has_seen_intro || false,
          onboardingCompleted: data.user.onboarding_completed || false,
        }
      : null;

    const selectedAccount: AccountSummary | null = data.selected_account
      ? {
          id: data.selected_account.id,
          name: data.selected_account.name,
          googleAdsId: data.selected_account.google_ads_id || null,
          ga4PropertyId: data.selected_account.ga4_property_id || null,
          metaAdsId: data.selected_account.meta_ads_id || null,
          selectedMccId: null,
        }
      : null;

    const memberships = (data.memberships || []).map((membership) => ({
      tenantId: membership.tenant_id,
      name: membership.name,
      slug: membership.slug,
      role: membership.role,
      onboardingCompleted: membership.onboarding_completed,
      connectedPlatforms: membership.connected_platforms || [],
    }));

    const inviteContext = data.invite_context
      ? {
          pendingInvitesCount: data.invite_context.pending_invites_count,
          pendingInvites: (data.invite_context.pending_invites || []).map((invite) => ({
            inviteId: invite.invite_id,
            tenantId: invite.tenant_id,
            tenantName: invite.tenant_name,
            role: invite.role,
            invitedBy: invite.invited_by,
            expiresAt: invite.expires_at,
          })),
        }
      : null;

    const inferredNextAction = !data.valid || !data.user
      ? 'AUTH_REQUIRED'
      : (!selectedAccount && (data.requires_account_selection ?? true))
        ? 'SELECT_ACCOUNT'
        : data.user.onboarding_completed
          ? 'HOME'
          : 'ONBOARDING';

    return {
      sessionId,
      user,
      isAuthenticated:
        data.user_authenticated?.google || data.platforms?.google || false,
      authenticatedPlatforms: {
        google: data.user_authenticated?.google || false,
        meta: data.user_authenticated?.meta || false,
      },
      connectedPlatforms: {
        google: data.platforms?.google || false,
        ga4: data.platforms?.ga4 || false,
        meta: data.platforms?.meta || false,
        facebookOrganic: data.platforms?.facebook_organic || false,
        brevo: data.platforms?.brevo || false,
        hubspot: data.platforms?.hubspot || false,
        mailchimp: data.platforms?.mailchimp || false,
      },
      selectedAccount,
      expiresAt: data.expires_at || null,
      nextAction: data.next_action || inferredNextAction,
      activeTenantId: data.active_tenant_id || null,
      requiresAccountSelection: data.requires_account_selection ?? false,
      memberships,
      inviteContext,
    };
  }
}
