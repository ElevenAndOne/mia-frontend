/**
 * Onboarding Service
 * mia.onboarding - Onboarding flow management
 */

import type { Transport } from '../internal/transport';
import type { StorageAdapter } from '../internal/storage';

export const ONBOARDING_STEPS = {
  NOT_STARTED: 0,
  FIRST_PLATFORM_CONNECTED: 1,
  BRONZE_FACT_SHOWN: 2,
  ASKED_SECOND_PLATFORM: 3,
  SECOND_PLATFORM_CONNECTED: 4,
  COMPLETED: 5,
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

export interface OnboardingStatus {
  step: OnboardingStep;
  completed: boolean;
  skipped: boolean;
  platformsConnected: string[];
  platformCount: number;
  fullAccess: boolean;
  bronzeReady: boolean;
  growTaskId: string | null;
  growInsightsReady: boolean;
}

export interface BronzeFact {
  platform: string;
  headline: string;
  detail?: string;
  metricValue?: number;
  metricName?: string;
}

export interface AvailablePlatform {
  id: string;
  name: string;
  connected: boolean;
}

export interface GrowTaskStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  result?: {
    summary?: string;
  };
  error?: string;
}

export class OnboardingService {
  private transport: Transport;
  private storage: StorageAdapter;

  constructor(transport: Transport, storage: StorageAdapter) {
    this.transport = transport;
    this.storage = storage;
  }

  /**
   * Get current onboarding status
   *
   * @example
   * ```typescript
   * try {
   *   const status = await mia.onboarding.getStatus();
   *   if (status.completed) {
   *     // Skip onboarding UI
   *   }
   * } catch (error) {
   *   if (isMiaSDKError(error)) {
   *     setError('Failed to load onboarding status');
   *   }
   * }
   * ```
   */
  async getStatus(): Promise<OnboardingStatus> {
    const sessionId = this.storage.getSessionId();
    if (!sessionId) {
      throw new Error('No active session');
    }
    const response = await this.transport.request<{
      step: number;
      completed: boolean;
      skipped?: boolean;
      platforms_connected: string[];
      platform_count: number;
      full_access: boolean;
      bronze_ready: boolean;
      grow_task_id?: string;
      grow_insights_ready?: boolean;
    }>(`/api/onboarding/status?session_id=${encodeURIComponent(sessionId)}`);

    return {
      step: response.step as OnboardingStep,
      completed: response.completed,
      skipped: response.skipped || false,
      platformsConnected: response.platforms_connected || [],
      platformCount: response.platform_count || 0,
      fullAccess: response.full_access || false,
      bronzeReady: response.bronze_ready || false,
      growTaskId: response.grow_task_id || null,
      growInsightsReady: response.grow_insights_ready || false,
    };
  }

  /**
   * Advance to next onboarding step
   */
  async advanceStep(): Promise<void> {
    const sessionId = this.storage.getSessionId();
    if (!sessionId) {
      throw new Error('No active session');
    }
    await this.transport.request(`/api/onboarding/advance?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
    });
  }

  /**
   * Update to specific onboarding step
   */
  async updateStep(step: number): Promise<void> {
    const sessionId = this.storage.getSessionId();
    if (!sessionId) {
      throw new Error('No active session');
    }
    await this.transport.request('/api/onboarding/update-step', {
      method: 'POST',
      body: { session_id: sessionId, step },
    });
  }

  /**
   * Mark onboarding as complete
   */
  async complete(platformsAtCompletion?: string[]): Promise<void> {
    const sessionId = this.storage.getSessionId();
    if (!sessionId) {
      throw new Error('No active session');
    }
    await this.transport.request('/api/onboarding/complete', {
      method: 'POST',
      body: {
        session_id: sessionId,
        ...(platformsAtCompletion ? { platforms_at_completion: platformsAtCompletion } : {}),
      },
    });
  }

  /**
   * Skip onboarding process
   */
  async skip(): Promise<void> {
    const sessionId = this.storage.getSessionId();
    if (!sessionId) {
      throw new Error('No active session');
    }
    await this.transport.request(`/api/onboarding/skip?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
    });
  }

  /**
   * Get available platforms for onboarding
   */
  async getAvailablePlatforms(): Promise<AvailablePlatform[]> {
    const sessionId = this.storage.getSessionId();
    if (!sessionId) {
      throw new Error('No active session');
    }
    const response = await this.transport.request<{
      all_platforms: Array<{
        id: string;
        name: string;
        connected: boolean;
      }>;
    }>(`/api/onboarding/available-platforms?session_id=${encodeURIComponent(sessionId)}`);

    return (response.all_platforms || []).map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
    }));
  }

  /**
   * Get bronze highlight (instant fact)
   */
  async getBronzeHighlight(platform?: string): Promise<BronzeFact> {
    const response = await this.transport.request<{
      platform: string;
      headline: string;
      detail?: string;
      metric_value?: number;
      metric_name?: string;
    }>('/api/bronze/highlight', {
      method: 'POST',
      body: platform ? { platform } : {},
    });

    return {
      platform: response.platform,
      headline: response.headline,
      detail: response.detail,
      metricValue: response.metric_value,
      metricName: response.metric_name,
    };
  }

  /**
   * Get bronze followup analysis
   */
  async getBronzeFollowup(platform?: string): Promise<BronzeFact> {
    const response = await this.transport.request<{
      platform: string;
      headline: string;
      detail?: string;
      metric_value?: number;
      metric_name?: string;
    }>('/api/bronze/followup', {
      method: 'POST',
      body: platform ? { platform } : {},
    });

    return {
      platform: response.platform,
      headline: response.headline,
      detail: response.detail,
      metricValue: response.metric_value,
      metricName: response.metric_name,
    };
  }

  /**
   * Start async grow insights generation
   */
  async startGrowInsightsAsync(): Promise<{ taskId: string }> {
    const response = await this.transport.request<{ task_id: string }>(
      '/api/insights/grow/async',
      { method: 'POST' }
    );
    return { taskId: response.task_id };
  }

  /**
   * Check grow insights task status
   */
  async checkGrowInsightsStatus(taskId: string): Promise<GrowTaskStatus> {
    const response = await this.transport.request<{
      status: string;
      progress?: number;
      result?: {
        summary?: string;
      };
      error?: string;
    }>(`/api/insights/task/${taskId}`);

    return {
      status: response.status as GrowTaskStatus['status'],
      progress: response.progress,
      result: response.result,
      error: response.error,
    };
  }
}
