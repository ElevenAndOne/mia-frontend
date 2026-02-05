/**
 * Insights Service
 * mia.insights - Insights generation domain (including SSE streaming)
 */

import type { Transport } from '../internal/transport';
import type { StorageAdapter } from '../internal/storage';
import {
  createSSEStream,
  createControllableSSEStream,
  type SSEChunk,
} from '../internal/sse';

export type InsightType = 'grow' | 'optimize' | 'protect' | 'summary';

export interface InsightRequest {
  dateRange?: string;
  platforms?: string[];
}

export interface InsightResponse {
  success: boolean;
  type?: string;
  summary?: string;
  insights?: unknown;
  data?: unknown;
}

export interface AsyncTaskResult {
  taskId: string;
}

export interface TaskStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  result?: InsightResponse;
  error?: string;
}

export interface BronzeHighlight {
  fact: string;
  metric?: string;
  value?: number;
  change?: number;
  headline?: string;
  detail?: string;
}

export interface BronzeFollowup {
  analysis: string;
  followup_fact?: string;
}

export class InsightsService {
  private transport: Transport;
  private storage: StorageAdapter;
  private baseUrl: string;

  constructor(transport: Transport, storage: StorageAdapter, baseUrl: string) {
    this.transport = transport;
    this.storage = storage;
    this.baseUrl = baseUrl;
  }

  // ==================== NON-STREAMING ====================

  /**
   * Generate insights (non-streaming)
   */
  async generate(
    type: InsightType,
    options: InsightRequest = {}
  ): Promise<InsightResponse> {
    return this.transport.request(`/api/quick-insights/${type}`, {
      method: 'POST',
      body: {
        date_range: options.dateRange || '30_days',
        platforms: options.platforms,
      },
    });
  }

  /**
   * Generate summary insights
   */
  async getSummary(dateRange = '30_days'): Promise<InsightResponse> {
    return this.transport.request('/api/quick-insights/summary', {
      method: 'POST',
      body: { date_range: dateRange },
    });
  }

  // ==================== STREAMING ====================

  /**
   * Stream Grow insights
   *
   * @example
   * ```typescript
   * try {
   *   const stream = mia.insights.streamGrow({ dateRange: '30_days' });
   *   for await (const chunk of stream) {
   *     if (chunk.type === 'text') fullText += chunk.text;
   *     else if (chunk.type === 'done') setIsComplete(true);
   *     else if (chunk.type === 'error') setError(chunk.error);
   *   }
   * } catch (error) {
   *   if (isMiaSDKError(error)) {
   *     setError('Failed to load insights');
   *   }
   * }
   * ```
   */
  streamGrow(options: InsightRequest = {}): AsyncGenerator<SSEChunk> {
    return this.createStream('grow', options);
  }

  /**
   * Stream Optimize insights
   */
  streamOptimize(options: InsightRequest = {}): AsyncGenerator<SSEChunk> {
    return this.createStream('optimize', options);
  }

  /**
   * Stream Protect insights
   */
  streamProtect(options: InsightRequest = {}): AsyncGenerator<SSEChunk> {
    return this.createStream('protect', options);
  }

  /**
   * Stream with abort capability
   * Returns both the stream and an abort function
   */
  streamWithAbort(
    type: InsightType,
    options: InsightRequest = {}
  ): {
    stream: AsyncGenerator<SSEChunk>;
    abort: () => void;
  } {
    return createControllableSSEStream(
      { baseUrl: this.baseUrl, storage: this.storage, timeout: 120000 },
      `/api/quick-insights/${type}/stream`,
      {
        date_range: options.dateRange || '30_days',
        platforms: options.platforms,
      }
    );
  }

  /**
   * Stream onboarding grow summary
   */
  streamOnboardingGrow(platforms?: string[]): AsyncGenerator<SSEChunk> {
    return createSSEStream(
      { baseUrl: this.baseUrl, storage: this.storage, timeout: 65000 },
      '/api/onboarding/grow-summary/stream',
      {
        platforms: platforms && platforms.length > 0 ? platforms : undefined,
      }
    );
  }

  /**
   * Stream intelligence snapshot
   */
  streamSnapshot(options: InsightRequest = {}): AsyncGenerator<SSEChunk> {
    return createSSEStream(
      { baseUrl: this.baseUrl, storage: this.storage, timeout: 120000 },
      '/api/snapshot/stream',
      {
        date_range: options.dateRange || '30_days',
        platforms: options.platforms,
      }
    );
  }

  // ==================== ASYNC TASK MANAGEMENT ====================

  /**
   * Start async insight generation
   */
  async startAsync(type: InsightType): Promise<AsyncTaskResult> {
    const response = await this.transport.request<{ task_id: string }>(
      `/api/insights/${type}/async`,
      { method: 'POST' }
    );
    return { taskId: response.task_id };
  }

  /**
   * Poll for async task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    return this.transport.request(`/api/insights/task/${taskId}`);
  }

  /**
   * Cancel async task
   */
  async cancelTask(taskId: string): Promise<void> {
    await this.transport.request(`/api/insights/task/${taskId}`, {
      method: 'DELETE',
    });
  }

  // ==================== BRONZE TIER ====================

  /**
   * Get instant bronze fact (<1 second response)
   */
  async getBronzeHighlight(
    highlightType: InsightType,
    dateRange = '30_days'
  ): Promise<BronzeHighlight> {
    return this.transport.request('/api/bronze/highlight', {
      method: 'POST',
      body: {
        highlight_type: highlightType,
        date_range: dateRange,
      },
    });
  }

  /**
   * Follow up on bronze fact with AI analysis
   */
  async getBronzeFollowup(factId: string): Promise<BronzeFollowup> {
    return this.transport.request('/api/bronze/followup', {
      method: 'POST',
      body: { fact_id: factId },
    });
  }

  /**
   * Get prefetch status for bronze data
   */
  async getPrefetchStatus(): Promise<{
    ready: boolean;
    platforms?: string[];
  }> {
    return this.transport.request('/api/bronze/prefetch-status');
  }

  private createStream(
    type: InsightType,
    options: InsightRequest
  ): AsyncGenerator<SSEChunk> {
    return createSSEStream(
      { baseUrl: this.baseUrl, storage: this.storage, timeout: 120000 },
      `/api/quick-insights/${type}/stream`,
      {
        date_range: options.dateRange || '30_days',
        platforms: options.platforms,
      }
    );
  }
}

// Re-export SSE types
export type { SSEChunk } from '../internal/sse';
