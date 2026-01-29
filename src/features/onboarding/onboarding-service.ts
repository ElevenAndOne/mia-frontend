import type {
  GoogleAccount,
  GoogleCampaign,
  MetaAdAccount,
  MetaCampaign,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const onboardingService = {
  /**
   * Fetch Google Ads accounts for authenticated user
   *
   * Endpoint: GET /api/integrations/google/accounts
   */
  async getGoogleAccounts(): Promise<GoogleAccount[]> {
    const response = await fetch(`${API_BASE}/integrations/google/accounts`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch Google accounts');
    }
    return response.json();
  },

  /**
   * Fetch campaigns for a Google Ads account
   *
   * Endpoint: GET /api/integrations/google/accounts/{accountId}/campaigns
   */
  async getGoogleCampaigns(accountId: string): Promise<GoogleCampaign[]> {
    const response = await fetch(
      `${API_BASE}/integrations/google/accounts/${accountId}/campaigns`,
      {
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch Google campaigns');
    }
    return response.json();
  },

  /**
   * Fetch Meta Ad accounts for authenticated user
   *
   * Endpoint: GET /api/integrations/meta/ad-accounts
   */
  async getMetaAccounts(): Promise<MetaAdAccount[]> {
    const response = await fetch(`${API_BASE}/integrations/meta/ad-accounts`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch Meta accounts');
    }
    return response.json();
  },

  /**
   * Fetch campaigns for a Meta Ad account
   *
   * Endpoint: GET /api/integrations/meta/ad-accounts/{accountId}/campaigns
   */
  async getMetaCampaigns(accountId: string): Promise<MetaCampaign[]> {
    const response = await fetch(
      `${API_BASE}/integrations/meta/ad-accounts/${accountId}/campaigns`,
      {
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch Meta campaigns');
    }
    return response.json();
  },

  /**
   * Save selected account and campaigns
   *
   * Endpoint: POST /api/onboarding/complete
   */
  async saveSelections(data: {
    provider: string;
    accountId: string;
    campaignIds: string[];
  }): Promise<void> {
    const response = await fetch(`${API_BASE}/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to save selections');
    }
  },
};
