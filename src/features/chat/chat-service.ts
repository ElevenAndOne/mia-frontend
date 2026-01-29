import type { BronzeHighlight, BronzeFollowup } from '../onboarding/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const chatService = {
  /**
   * Get streaming endpoint URL for grow summary
   *
   * Endpoint: GET /api/onboarding/grow-summary/stream (SSE)
   */
  getGrowSummaryStreamUrl(): string {
    return `${API_BASE}/onboarding/grow-summary/stream`;
  },

  /**
   * Fetch bronze highlight data
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
   * Fetch bronze followup based on user question
   *
   * Endpoint: POST /api/bronze/followup
   */
  async fetchBronzeFollowup(question: string): Promise<BronzeFollowup> {
    const response = await fetch(`${API_BASE}/bronze/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ question }),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch bronze followup');
    }
    return response.json();
  },
};
