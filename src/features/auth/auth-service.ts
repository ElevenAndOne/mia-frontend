import type { AuthProvider, User } from './types';
import { mockUsers } from '../../mocks/users';

// ============================================================
// API INTEGRATION POINT
// Replace mock implementations with real API calls here.
// The interface remains the same - only the implementation changes.
// ============================================================

const SIMULATED_DELAY = 500;

function simulateDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
}

export const authService = {
  /**
   * Authenticate user with provider
   *
   * FUTURE: Replace with OAuth flow
   * - Google: googleapis.com/oauth2/v4/token
   * - Meta: graph.facebook.com/oauth/access_token
   */
  async login(provider: AuthProvider): Promise<User> {
    await simulateDelay();
    return mockUsers[provider];
  },

  /**
   * Validate existing session
   *
   * FUTURE: Call /api/auth/session endpoint
   */
  async validateSession(): Promise<User | null> {
    await simulateDelay();
    return null;
  },

  /**
   * Log out user
   *
   * FUTURE: Call /api/auth/logout and clear tokens
   */
  async logout(): Promise<void> {
    await simulateDelay();
  },
};
