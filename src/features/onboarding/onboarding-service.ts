import type {
  GoogleAccount,
  GoogleCampaign,
  MetaAdAccount,
  MetaCampaign,
} from './types';
import {
  mockGoogleAccounts,
  mockGoogleCampaigns,
} from '../../mocks/google-accounts';
import { mockMetaAdAccounts, mockMetaCampaigns } from '../../mocks/meta-accounts';

// ============================================================
// API INTEGRATION POINT
// Replace mock data returns with actual API calls.
// Each function documents the expected API endpoint.
// ============================================================

const SIMULATED_DELAY = 300;

function simulateDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
}

export const onboardingService = {
  /**
   * Fetch Google Ads accounts for authenticated user
   *
   * FUTURE: GET /api/integrations/google/accounts
   * Headers: Authorization: Bearer {accessToken}
   */
  async getGoogleAccounts(): Promise<GoogleAccount[]> {
    await simulateDelay();
    return mockGoogleAccounts;
  },

  /**
   * Fetch campaigns for a Google Ads account
   *
   * FUTURE: GET /api/integrations/google/accounts/{accountId}/campaigns
   */
  async getGoogleCampaigns(accountId: string): Promise<GoogleCampaign[]> {
    await simulateDelay();
    return mockGoogleCampaigns.filter(c => c.accountId === accountId);
  },

  /**
   * Fetch Meta Ad accounts for authenticated user
   *
   * FUTURE: GET /api/integrations/meta/ad-accounts
   */
  async getMetaAccounts(): Promise<MetaAdAccount[]> {
    await simulateDelay();
    return mockMetaAdAccounts;
  },

  /**
   * Fetch campaigns for a Meta Ad account
   *
   * FUTURE: GET /api/integrations/meta/ad-accounts/{accountId}/campaigns
   */
  async getMetaCampaigns(accountId: string): Promise<MetaCampaign[]> {
    await simulateDelay();
    return mockMetaCampaigns.filter(c => c.accountId === accountId);
  },

  /**
   * Save selected account and campaigns
   *
   * FUTURE: POST /api/onboarding/complete
   * Body: { provider, accountId, campaignIds }
   */
  async saveSelections(data: {
    provider: string;
    accountId: string;
    campaignIds: string[];
  }): Promise<void> {
    await simulateDelay();
    console.log('Selections saved:', data);
  },
};
