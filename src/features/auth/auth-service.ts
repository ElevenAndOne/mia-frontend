import type { AuthProvider, User } from './types';
import { oauthService } from './oauth-service';

export const authService = {
  /**
   * Get user from current session
   * For OAuth providers, call this after OAuth success to get user data
   */
  async getCurrentUser(): Promise<User | null> {
    return oauthService.getCurrentUser();
  },

  /**
   * Login with provider
   * For OAuth (google/meta), this is called after OAuth popup completes
   * For email, this handles the email auth flow
   */
  async login(provider: AuthProvider): Promise<User> {
    if (provider === 'email') {
      // TODO: Implement email auth flow
      throw new Error('Email auth not yet implemented');
    }

    // For OAuth providers, the actual login happens via popup
    // This method is called after OAuth success to get user data
    const user = await oauthService.getCurrentUser();
    if (!user) {
      throw new Error('Failed to get user after OAuth');
    }
    return user;
  },

  /**
   * Validate existing session
   */
  async validateSession(): Promise<User | null> {
    const session = await oauthService.getSession();
    if (!session) return null;
    return oauthService.getCurrentUser();
  },

  /**
   * Log out user
   */
  async logout(): Promise<void> {
    await oauthService.logout();
  },
};
