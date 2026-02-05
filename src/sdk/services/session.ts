/**
 * Session Service
 * mia.session - Session management domain
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
   * Restore session from storage or create new one.
   * This is the primary entry point on app load.
   *
   * @example
   * ```typescript
   * try {
   *   const { success, session, isNewSession } = await mia.session.restore();
   *   if (session?.isAuthenticated) {
   *     setUser(session.user);
   *   }
   * } catch (error) {
   *   if (isMiaSDKError(error)) {
   *     setAppError('Failed to restore session');
   *   }
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
        `/api/session/validate?session_id=${sessionId}`,
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
   * Validate current session.
   * Returns null if session is invalid or doesn't exist.
   */
  async validate(): Promise<SessionData | null> {
    const sessionId = this.storage.getSessionId();
    if (!sessionId) return null;

    const data = await this.transport.request<RawSessionValidationResponse>(
      `/api/session/validate?session_id=${sessionId}`,
      { skipAuth: true }
    );

    if (!data.valid) return null;

    return this.buildSessionData(sessionId, data);
  }

  /**
   * Get current session ID from storage
   */
  getSessionId(): string | null {
    return this.storage.getSessionId();
  }

  /**
   * Get current user ID from storage
   */
  getUserId(): string | null {
    return this.storage.getUserId();
  }

  /**
   * Create a new session (generates new ID and stores it)
   */
  createNew(): string {
    const sessionId = generateSessionId();
    this.storage.setSessionId(sessionId);
    return sessionId;
  }

  /**
   * Clear session (logout)
   */
  clear(): void {
    this.storage.clearSession();
  }

  /**
   * Select MCC (Manager Customer Center) for Google Ads
   */
  async selectMcc(mccId: string): Promise<void> {
    const sessionId = this.storage.getSessionId();
    await this.transport.request('/api/session/select-mcc', {
      method: 'POST',
      body: { session_id: sessionId, mcc_id: mccId },
    });
  }

  /**
   * Sync accounts with backend.
   * Validates DB entries against actual API data.
   */
  async syncAccounts(): Promise<void> {
    const sessionId = this.storage.getSessionId();
    await this.transport.request(`/api/accounts/sync?session_id=${sessionId}`, {
      method: 'POST',
    });
  }

  /**
   * Get account sync status for debugging
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
        facebookOrganic: false,
        brevo: data.platforms?.brevo || false,
        hubspot: data.platforms?.hubspot || false,
        mailchimp: data.platforms?.mailchimp || false,
      },
      selectedAccount,
      expiresAt: data.expires_at || null,
    };
  }
}
