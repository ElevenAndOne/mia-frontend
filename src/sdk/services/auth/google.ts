/**
 * Google Auth Service
 * mia.auth.google - Google OAuth domain
 */

import type { Transport } from '../../internal/transport';
import type { StorageAdapter } from '../../internal/storage';
import type { User } from '../../types/session';
import type { MccAccount, GoogleAdsAccount } from '../../types/accounts';
import { createSDKError, ErrorCodes } from '../../types/errors';
import { isMobile } from '../../utils/session-id';

interface AuthUrlResponse {
  auth_url: string;
}

interface AuthStatusResponse {
  authenticated: boolean;
  needs_session_creation?: boolean;
  user_info?: {
    id: string;
    name: string;
    email: string;
    picture: string;
    has_seen_intro?: boolean;
  };
  selected_account?: {
    id: string;
    name: string;
    google_ads_id?: string;
    ga4_property_id?: string;
    meta_ads_id?: string;
    business_type?: string;
  };
}

interface CompleteResponse {
  success: boolean;
  session_id?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  is_new_user?: boolean;
}

interface AdAccountsResponse {
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

export interface GoogleConnectResult {
  success: boolean;
  user: User | null;
  isNewUser: boolean;
}

export interface GoogleConnectOptions {
  onPopupClosed?: () => void;
  tenantId?: string;
}

const POPUP_TIMEOUT_MS = 300000; // 5 minutes

export class GoogleAuthService {
  private transport: Transport;
  private storage: StorageAdapter;

  constructor(transport: Transport, storage: StorageAdapter) {
    this.transport = transport;
    this.storage = storage;
  }

  /**
   * Full OAuth connection flow (handles popup on desktop, redirect on mobile)
   *
   * @example
   * ```typescript
   * try {
   *   const result = await mia.auth.google.connect({
   *     onPopupClosed: () => setLoading(false),
   *   });
   *   if (result.success) {
   *     const { accounts } = await mia.accounts.list();
   *   }
   * } catch (error) {
   *   if (isMiaSDKError(error)) {
   *     if (error.code === 'OAUTH_POPUP_BLOCKED') {
   *       setError('Please allow popups');
   *     }
   *   }
   * }
   * ```
   */
  async connect(options: GoogleConnectOptions = {}): Promise<GoogleConnectResult> {
    const mobile = isMobile();

    // Get auth URL
    const frontendOrigin = encodeURIComponent(window.location.origin);
    let url = `/api/oauth/google/auth-url?frontend_origin=${frontendOrigin}`;
    if (options.tenantId) {
      url += `&tenant_id=${options.tenantId}`;
    }

    const { auth_url } = await this.transport.request<AuthUrlResponse>(url, {
      skipAuth: true,
    });

    if (mobile) {
      // Store state for redirect flow
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mia_oauth_pending', 'google');
        localStorage.setItem('mia_oauth_return_url', window.location.href);
      }
      window.location.href = auth_url;

      // Will never resolve - page redirects
      return new Promise(() => {});
    }

    // Desktop popup flow
    return this.handlePopupFlow(auth_url, options.onPopupClosed);
  }

  /**
   * Complete OAuth flow after mobile redirect.
   * Call this when detecting oauth_complete=google in URL params.
   */
  async completeRedirect(userId?: string): Promise<CompleteResponse> {
    const url = userId
      ? `/api/oauth/google/complete?user_id=${userId}`
      : '/api/oauth/google/complete';

    return this.transport.request<CompleteResponse>(url, {
      method: 'POST',
    });
  }

  /**
   * Check current auth status
   */
  async getStatus(): Promise<AuthStatusResponse> {
    return this.transport.request<AuthStatusResponse>('/api/oauth/google/status');
  }

  /**
   * Logout from Google
   */
  async logout(): Promise<void> {
    await this.transport.request('/api/oauth/google/logout', {
      method: 'POST',
    });
    this.storage.clearSession();
  }

  /**
   * Get Google Ads accounts (MCC and regular)
   */
  async getAdAccounts(userId: string): Promise<{
    mccAccounts: MccAccount[];
    regularAccounts: GoogleAdsAccount[];
  }> {
    const response = await this.transport.request<AdAccountsResponse>(
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
   * Get user info
   */
  async getUserInfo(userId?: string): Promise<{
    id: string;
    name: string;
    email: string;
    picture?: string;
  } | null> {
    const url = userId
      ? `/api/oauth/google/user-info?user_id=${encodeURIComponent(userId)}`
      : '/api/oauth/google/user-info';

    try {
      return await this.transport.request(url);
    } catch {
      return null;
    }
  }

  private async handlePopupFlow(
    authUrl: string,
    onPopupClosed?: () => void
  ): Promise<GoogleConnectResult> {
    const popup = window.open(
      authUrl,
      'google-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      throw createSDKError(
        ErrorCodes.OAUTH_POPUP_BLOCKED,
        'Popup blocked. Please allow popups for this site.'
      );
    }

    return new Promise((resolve, reject) => {
      let userId: string | null = null;
      let resolved = false;

      // Listen for message from popup
      const messageHandler = (event: MessageEvent) => {
        if (
          event.data?.type === 'oauth_complete' &&
          event.data?.provider === 'google'
        ) {
          userId = event.data.user_id || null;
          window.removeEventListener('message', messageHandler);
        }
      };
      window.addEventListener('message', messageHandler);

      // Poll for popup close
      const pollTimer = setInterval(async () => {
        if (popup.closed && !resolved) {
          resolved = true;
          clearInterval(pollTimer);
          window.removeEventListener('message', messageHandler);
          onPopupClosed?.();

          try {
            // Complete the auth flow
            const url = userId
              ? `/api/oauth/google/complete?user_id=${userId}`
              : '/api/oauth/google/complete';

            await this.transport.request(url, { method: 'POST' });

            // Get final status
            const status = await this.getStatus();

            if (status.authenticated && status.user_info) {
              this.storage.setUserId(status.user_info.id);
              resolve({
                success: true,
                user: {
                  id: status.user_info.id,
                  name: status.user_info.name,
                  email: status.user_info.email,
                  pictureUrl: status.user_info.picture,
                  hasSeenIntro: status.user_info.has_seen_intro || false,
                  onboardingCompleted: false,
                },
                isNewUser: false,
              });
            } else {
              resolve({ success: false, user: null, isNewUser: false });
            }
          } catch (error) {
            reject(error);
          }
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          clearInterval(pollTimer);
          window.removeEventListener('message', messageHandler);
          if (!popup.closed) popup.close();
          reject(
            createSDKError(ErrorCodes.OAUTH_CANCELLED, 'Authentication timed out')
          );
        }
      }, POPUP_TIMEOUT_MS);
    });
  }
}
