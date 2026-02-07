/**
 * Google Auth Service
 * mia.auth.google - Google OAuth domain
 */

import type { Transport } from '../../internal/transport';
import type { StorageAdapter } from '../../internal/storage';
import type { User } from '../../types/session';
import type { MccAccount, GoogleAdsAccount } from '../../types/accounts';
import { generateSessionId } from '../../utils/session-id';

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

interface SilentLoginResponse {
  success: boolean;
  requires_oauth?: boolean;
  session_id?: string;
  user?: {
    id: string;
    name: string;
    email: string;
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
  returnTo?: string;
}

export interface GoogleSilentLoginOptions {
  lastUserId?: string;
  allowRecentFallback?: boolean;
}

export class GoogleAuthService {
  private transport: Transport;
  private storage: StorageAdapter;

  constructor(transport: Transport, storage: StorageAdapter) {
    this.transport = transport;
    this.storage = storage;
  }

  /**
   * Full OAuth connection flow (redirect-based on desktop and mobile)
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
    if (typeof window === 'undefined') {
      throw new Error('Google OAuth requires a browser environment');
    }

    // Ensure session ID exists before OAuth flow
    if (!this.storage.getSessionId()) {
      this.storage.setSessionId(generateSessionId());
    }

    // Get auth URL
    const frontendOrigin = encodeURIComponent(window.location.origin);
    const returnTo = encodeURIComponent(options.returnTo || window.location.href);
    let url = `/api/oauth/google/auth-url?frontend_origin=${frontendOrigin}&return_to=${returnTo}`;
    if (options.tenantId) {
      url += `&tenant_id=${options.tenantId}`;
    }

    const { auth_url } = await this.transport.request<AuthUrlResponse>(url, {
      skipAuth: true,
    });

    // Unified redirect flow for all devices.
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mia_oauth_pending', 'google');
      localStorage.setItem('mia_oauth_return_url', options.returnTo || window.location.href);
    }

    window.location.href = auth_url;
    return new Promise(() => {});
  }

  /**
   * Attempt silent login using stored credentials.
   * Returns requiresOAuth=true when deterministic login is not possible.
   */
  async loginWithStoredCredentials(
    options: GoogleSilentLoginOptions = {}
  ): Promise<{ success: boolean; requiresOAuth: boolean }> {
    const response = await this.transport.request<SilentLoginResponse>(
      '/api/oauth/google/login',
      {
        method: 'POST',
        skipAuth: true,
        body: {
          last_user_id: options.lastUserId,
          allow_recent_fallback: options.allowRecentFallback ?? false,
        },
      }
    );

    if (response.success && response.session_id) {
      this.storage.setSessionId(response.session_id);
      if (response.user?.id) {
        this.storage.setUserId(response.user.id);
      }
    }

    return {
      success: Boolean(response.success),
      requiresOAuth: Boolean(response.requires_oauth),
    };
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

}
