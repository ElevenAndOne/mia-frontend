import type {
  OnboardingStatus,
  OnboardingNumericStep,
  BronzeHighlight,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const onboardingApiService = {
  /**
   * Get current onboarding status
   *
   * Endpoint: GET /api/onboarding/status
   */
  async getStatus(): Promise<OnboardingStatus> {
    const response = await fetch(`${API_BASE}/onboarding/status`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch onboarding status');
    }
    return response.json();
  },

  /**
   * Advance to next onboarding step
   *
   * Endpoint: POST /api/onboarding/advance
   */
  async advanceStep(currentStep: OnboardingNumericStep): Promise<OnboardingStatus> {
    const response = await fetch(`${API_BASE}/onboarding/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentStep }),
    });
    if (!response.ok) {
      throw new Error('Failed to advance onboarding step');
    }
    return response.json();
  },

  /**
   * Save campaign selections and trigger grow analysis
   *
   * Endpoint: POST /api/onboarding/campaigns
   */
  async saveCampaigns(data: {
    provider: string;
    accountId: string;
    campaignIds: string[];
  }): Promise<{ taskId: string }> {
    const response = await fetch(`${API_BASE}/onboarding/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to save campaign selections');
    }
    return response.json();
  },

  /**
   * Check grow task status
   *
   * Endpoint: GET /api/onboarding/grow-status/{taskId}
   */
  async getGrowTaskStatus(
    taskId: string
  ): Promise<{ ready: boolean; progress: number }> {
    const response = await fetch(
      `${API_BASE}/onboarding/grow-status/${taskId}`,
      {
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to check grow task status');
    }
    return response.json();
  },

  /**
   * Fetch bronze highlight (first insight)
   *
   * Endpoint: GET /api/bronze/highlight
   */
  async fetchBronzeHighlight(): Promise<BronzeHighlight> {
    const response = await fetch(`${API_BASE}/bronze/highlight`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch bronze highlight');
    }
    return response.json();
  },

  /**
   * Get streaming endpoint URL for grow summary
   */
  getGrowSummaryStreamUrl(): string {
    return `${API_BASE}/onboarding/grow-summary/stream`;
  },
};
