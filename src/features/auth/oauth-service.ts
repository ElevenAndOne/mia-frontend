import type { OAuthProvider, TokenResponse, SessionData, OAuthPopupConfig } from './oauth-types';
import type { User } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// OAuth provider configurations
const OAUTH_CONFIGS: Record<OAuthProvider, OAuthPopupConfig> = {
  google: {
    width: 500,
    height: 600,
    url: `${API_BASE}/auth/google/authorize`,
  },
  meta: {
    width: 600,
    height: 700,
    url: `${API_BASE}/auth/meta/authorize`,
  },
};

export const oauthService = {
  /**
   * Open OAuth popup window
   */
  openPopup(provider: OAuthProvider): Window | null {
    const config = OAUTH_CONFIGS[provider];
    const left = window.screenX + (window.outerWidth - config.width) / 2;
    const top = window.screenY + (window.outerHeight - config.height) / 2;

    const features = [
      `width=${config.width}`,
      `height=${config.height}`,
      `left=${left}`,
      `top=${top}`,
      'toolbar=no',
      'menubar=no',
      'scrollbars=yes',
      'resizable=yes',
    ].join(',');

    return window.open(config.url, `${provider}OAuth`, features);
  },

  /**
   * Exchange authorization code for tokens
   *
   * Endpoint: POST /api/auth/{provider}/token
   */
  async exchangeCode(
    provider: OAuthProvider,
    code: string
  ): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE}/auth/${provider}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: 'Token exchange failed' }));
      throw new Error(error.message);
    }

    return response.json();
  },

  /**
   * Validate and get current session
   *
   * Endpoint: GET /api/auth/session
   */
  async getSession(): Promise<SessionData | null> {
    const response = await fetch(`${API_BASE}/auth/session`, {
      credentials: 'include',
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return response.json();
  },

  /**
   * Get current user data
   *
   * Endpoint: GET /api/auth/me
   */
  async getCurrentUser(): Promise<User | null> {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  },

  /**
   * Refresh access token
   *
   * Endpoint: POST /api/auth/refresh
   */
  async refreshToken(): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return response.json();
  },

  /**
   * Logout and clear session
   *
   * Endpoint: POST /api/auth/logout
   */
  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};
