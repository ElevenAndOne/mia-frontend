/**
 * Meta Auth Service
 * mia.auth.meta - Meta/Facebook OAuth domain
 */

import type { Transport } from '../../internal/transport';
import type { StorageAdapter } from '../../internal/storage';
import type { User } from '../../types/session';
import type { MetaAdAccount } from '../../types/accounts';
import type { FacebookPage, RawFacebookPageResponse } from '../../types/platforms';
import { createSDKError, ErrorCodes } from '../../types/errors';
import { generateSessionId } from '../../utils/session-id';

interface AuthUrlResponse {
  auth_url: string;
  state?: string;
}

interface AuthStatusResponse {
  authenticated: boolean;
  user_info?: {
    id: string;
    name: string;
    email?: string;
    has_seen_intro?: boolean;
  };
}

interface CompleteResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
}

interface AvailableAccountsResponse {
  accounts: Array<{
    id: string;
    name: string;
    account_id: string;
    currency: string;
    timezone_name: string;
    account_status: number;
  }>;
}

export interface MetaConnectResult {
  success: boolean;
  user: Partial<User> | null;
}

export interface MetaConnectOptions {
  tenantId?: string;
  onPopupClosed?: () => void;
}

const POPUP_TIMEOUT_MS = 300000; // 5 minutes

export class MetaAuthService {
  private transport: Transport;
  private storage: StorageAdapter;

  constructor(transport: Transport, storage: StorageAdapter) {
    this.transport = transport;
    this.storage = storage;
  }

  /**
   * Full OAuth connection flow (popup only - no mobile redirect for Meta)
   *
   * @example
   * ```typescript
   * try {
   *   const result = await mia.auth.meta.connect({
   *     onPopupClosed: () => setLoading(false),
   *   });
   *   if (result.success) {
   *     const accounts = await mia.auth.meta.getAvailableAccounts();
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
  async connect(options: MetaConnectOptions = {}): Promise<MetaConnectResult> {
    // Ensure session ID exists before OAuth flow
    if (!this.storage.getSessionId()) {
      this.storage.setSessionId(generateSessionId());
    }

    // Get auth URL
    let url = '/api/oauth/meta/auth-url';
    if (options.tenantId) {
      url += `?tenant_id=${options.tenantId}`;
    }

    const { auth_url } = await this.transport.request<AuthUrlResponse>(url, {
      skipAuth: true,
    });

    return this.handlePopupFlow(auth_url, options.onPopupClosed);
  }

  /**
   * Get current auth status
   */
  async getStatus(): Promise<AuthStatusResponse> {
    return this.transport.request<AuthStatusResponse>('/api/oauth/meta/status');
  }

  /**
   * Logout from Meta
   */
  async logout(): Promise<void> {
    await this.transport.request('/api/oauth/meta/logout', {
      method: 'POST',
    });
  }

  /**
   * Get available Meta ad accounts for linking
   */
  async getAvailableAccounts(): Promise<MetaAdAccount[]> {
    const response = await this.transport.request<AvailableAccountsResponse>(
      '/api/oauth/meta/accounts/available'
    );

    return (response.accounts || []).map((acc) => ({
      id: acc.id,
      name: acc.name,
      accountId: acc.account_id,
      currency: acc.currency,
      timezoneName: acc.timezone_name,
      accountStatus: acc.account_status,
    }));
  }

  /**
   * Link a Meta ad account to the current account mapping
   */
  async linkAccount(metaAccountId: string): Promise<void> {
    await this.transport.request('/api/oauth/meta/accounts/link', {
      method: 'POST',
      body: { meta_account_id: metaAccountId },
    });
  }

  /**
   * Check if Meta credentials exist in database
   */
  async checkCredentials(): Promise<{ hasCredentials: boolean }> {
    const sessionId = this.storage.getSessionId();
    return this.transport.request(
      `/api/oauth/meta/credentials-status?session_id=${sessionId}`
    );
  }

  /**
   * Get Facebook pages for organic content
   */
  async getFacebookPages(refresh = false): Promise<FacebookPage[]> {
    const url = refresh
      ? '/api/oauth/meta/organic/facebook-pages?refresh=true'
      : '/api/oauth/meta/organic/facebook-pages';

    const response = await this.transport.request<RawFacebookPageResponse[]>(url);

    return (response || []).map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category,
      fanCount: page.fan_count,
      link: page.link,
      accessToken: page.access_token,
    }));
  }

  /**
   * Link a Facebook page for organic insights
   */
  async linkFacebookPage(
    pageId: string,
    options?: {
      pageName?: string;
      pageAccessToken?: string;
      accountId?: string | number;
    }
  ): Promise<void> {
    await this.transport.request('/api/oauth/meta/organic/link-page', {
      method: 'POST',
      body: {
        page_id: pageId,
        ...(options?.pageName && { page_name: options.pageName }),
        ...(options?.pageAccessToken && { page_access_token: options.pageAccessToken }),
        ...(options?.accountId && { account_id: options.accountId }),
      },
    });
  }

  /**
   * Get user info
   */
  async getUserInfo(userId?: string): Promise<{
    id: string;
    name: string;
    email?: string;
  } | null> {
    const url = userId
      ? `/api/oauth/meta/user-info?user_id=${encodeURIComponent(userId)}`
      : '/api/oauth/meta/user-info';

    try {
      return await this.transport.request(url);
    } catch {
      return null;
    }
  }

  private async handlePopupFlow(
    authUrl: string,
    onPopupClosed?: () => void
  ): Promise<MetaConnectResult> {
    const popup = window.open(
      authUrl,
      'meta-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      throw createSDKError(
        ErrorCodes.OAUTH_POPUP_BLOCKED,
        'Popup blocked. Please allow popups for this site.'
      );
    }

    return new Promise((resolve, reject) => {
      let resolved = false;

      const pollTimer = setInterval(async () => {
        if (popup.closed && !resolved) {
          resolved = true;
          clearInterval(pollTimer);
          onPopupClosed?.();

          try {
            const status = await this.getStatus();

            if (status.authenticated) {
              // Complete the auth flow
              const completeData = await this.transport.request<CompleteResponse>(
                '/api/oauth/meta/complete',
                { method: 'POST' }
              );

              resolve({
                success: true,
                user: completeData.user
                  ? {
                      id: completeData.user.id,
                      name: completeData.user.name,
                      email: completeData.user.email || '',
                    }
                  : null,
              });
            } else {
              resolve({ success: false, user: null });
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
          if (!popup.closed) popup.close();
          reject(
            createSDKError(ErrorCodes.OAUTH_CANCELLED, 'Authentication timed out')
          );
        }
      }, POPUP_TIMEOUT_MS);
    });
  }
}
