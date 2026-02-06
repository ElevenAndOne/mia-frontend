/**
 * Insights Service
 *
 * Generates AI-powered marketing insights from connected platform data.
 * Supports both synchronous requests and real-time SSE streaming for
 * progressive content delivery.
 *
 * **Namespace:** `mia.insights`
 *
 * **Insight Types:**
 * - `grow` - Growth opportunities and recommendations
 * - `optimize` - Optimization suggestions for existing campaigns
 * - `protect` - Risk detection and protective recommendations
 * - `summary` - High-level performance summary
 *
 * **Streaming vs Non-Streaming:**
 * - Use streaming methods (`streamGrow`, etc.) for real-time UI updates
 * - Use non-streaming (`generate`) when you need the complete response at once
 * - Use `streamWithAbort` when you need to cancel mid-stream
 *
 * @example
 * ```typescript
 * // Streaming (recommended for UI)
 * let fullText = '';
 * for await (const chunk of mia.insights.streamGrow({ dateRange: '30_days' })) {
 *   if (chunk.type === 'text') {
 *     fullText += chunk.text;
 *     updateDisplay(fullText);
 *   }
 * }
 *
 * // Non-streaming
 * const response = await mia.insights.generate('grow', { dateRange: '30_days' });
 * ```
 */

import type { Transport } from '../internal/transport';
import type { StorageAdapter } from '../internal/storage';
import {
  createSSEStream,
  createControllableSSEStream,
  type SSEChunk,
} from '../internal/sse';

/**
 * Type of insight to generate.
 * - `grow`: Growth opportunities
 * - `optimize`: Campaign optimization
 * - `protect`: Risk detection
 * - `summary`: Performance overview
 */
export type InsightType = 'grow' | 'optimize' | 'protect' | 'summary';

/**
 * Options for insight generation.
 */
export interface InsightRequest {
  /** Date range for analysis (e.g., '7_days', '30_days', '90_days') */
  dateRange?: string;
  /** Specific platforms to analyze (e.g., ['google_ads', 'meta']) */
  platforms?: string[];
}

/**
 * Response from non-streaming insight generation.
 */
export interface InsightResponse {
  success: boolean;
  type?: string;
  summary?: string;
  insights?: unknown;
  data?: unknown;
}

/**
 * Result from starting an async task.
 */
export interface AsyncTaskResult {
  /** Unique task ID for polling status */
  taskId: string;
}

/**
 * Status of an async insight generation task.
 */
export interface TaskStatus {
  /** Current task state */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** Progress percentage (0-100) */
  progress?: number;
  /** Final result when completed */
  result?: InsightResponse;
  /** Error message if failed */
  error?: string;
}

/**
 * Bronze tier instant fact (sub-second response).
 */
export interface BronzeHighlight {
  /** The insight fact */
  fact: string;
  /** Metric name */
  metric?: string;
  /** Metric value */
  value?: number;
  /** Percentage change */
  change?: number;
  /** Display headline */
  headline?: string;
  /** Additional detail */
  detail?: string;
}

/**
 * AI-generated followup to a bronze fact.
 */
export interface BronzeFollowup {
  /** Analysis text */
  analysis: string;
  /** Follow-up insight */
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
   * Generate insights synchronously (non-streaming).
   *
   * Returns the complete insight response. For progressive UI updates,
   * use the streaming methods instead.
   *
   * @param type - The insight type to generate
   * @param options - Generation options (dateRange, platforms)
   * @returns Promise resolving to complete insight response
   *
   * @example
   * ```typescript
   * const response = await mia.insights.generate('grow', {
   *   dateRange: '30_days',
   *   platforms: ['google_ads', 'meta'],
   * });
   *
   * if (response.success) {
   *   console.log(response.summary);
   * }
   * ```
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
   * Generate a summary of insights across all connected platforms.
   *
   * @param dateRange - Time period for analysis (default: '30_days')
   * @returns Promise resolving to summary response
   *
   * @example
   * ```typescript
   * const summary = await mia.insights.getSummary('7_days');
   * console.log(summary.summary);
   * ```
   */
  async getSummary(dateRange = '30_days'): Promise<InsightResponse> {
    return this.transport.request('/api/quick-insights/summary', {
      method: 'POST',
      body: { date_range: dateRange },
    });
  }

  // ==================== STREAMING ====================

  /**
   * Stream Grow insights via Server-Sent Events.
   *
   * Returns an async generator that yields chunks as they arrive from the server.
   * Use this for real-time UI updates while the AI generates content.
   *
   * **Chunk Types:**
   * - `text`: Content chunk - append to your display
   * - `done`: Stream complete - finalize UI
   * - `error`: Error occurred - handle gracefully
   *
   * @param options - Generation options (dateRange, platforms)
   * @returns AsyncGenerator yielding SSEChunk objects
   *
   * @example
   * ```typescript
   * let fullText = '';
   *
   * for await (const chunk of mia.insights.streamGrow({ dateRange: '30_days' })) {
   *   switch (chunk.type) {
   *     case 'text':
   *       fullText += chunk.text;
   *       setContent(fullText);
   *       break;
   *     case 'done':
   *       setIsLoading(false);
   *       break;
   *     case 'error':
   *       setError(chunk.error);
   *       break;
   *   }
   * }
   * ```
   */
  streamGrow(options: InsightRequest = {}): AsyncGenerator<SSEChunk> {
    return this.createStream('grow', options);
  }

  /**
   * Stream Optimize insights via Server-Sent Events.
   *
   * Provides optimization recommendations for existing campaigns.
   * See `streamGrow` for usage pattern.
   *
   * @param options - Generation options (dateRange, platforms)
   * @returns AsyncGenerator yielding SSEChunk objects
   */
  streamOptimize(options: InsightRequest = {}): AsyncGenerator<SSEChunk> {
    return this.createStream('optimize', options);
  }

  /**
   * Stream Protect insights via Server-Sent Events.
   *
   * Identifies risks and provides protective recommendations.
   * See `streamGrow` for usage pattern.
   *
   * @param options - Generation options (dateRange, platforms)
   * @returns AsyncGenerator yielding SSEChunk objects
   */
  streamProtect(options: InsightRequest = {}): AsyncGenerator<SSEChunk> {
    return this.createStream('protect', options);
  }

  /**
   * Stream insights with abort capability.
   *
   * Returns both the stream and an abort function, allowing you to cancel
   * the stream mid-generation (e.g., when the user navigates away).
   *
   * @param type - The insight type to generate
   * @param options - Generation options (dateRange, platforms)
   * @returns Object with `stream` (AsyncGenerator) and `abort` (function)
   *
   * @example
   * ```typescript
   * const { stream, abort } = mia.insights.streamWithAbort('grow');
   *
   * // Start streaming
   * (async () => {
   *   for await (const chunk of stream) {
   *     if (chunk.type === 'text') updateUI(chunk.text);
   *   }
   * })();
   *
   * // Abort on user action or cleanup
   * cancelButton.onclick = () => abort();
   *
   * // Cleanup on component unmount
   * useEffect(() => () => abort(), []);
   * ```
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
   * Stream grow summary for the onboarding flow.
   *
   * Optimized for the onboarding experience with a shorter timeout.
   * Generates a simplified grow summary for newly connected platforms.
   *
   * @param platforms - Optional list of platforms to include
   * @returns AsyncGenerator yielding SSEChunk objects
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
   * Stream a comprehensive intelligence snapshot.
   *
   * Provides a high-level overview of performance across all platforms.
   *
   * @param options - Generation options (dateRange, platforms)
   * @returns AsyncGenerator yielding SSEChunk objects
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
   * Start asynchronous insight generation.
   *
   * For long-running insight generation, use async tasks to avoid
   * request timeouts. Poll with `getTaskStatus` to check progress.
   *
   * @param type - The insight type to generate
   * @returns Promise resolving to task ID for polling
   *
   * @example
   * ```typescript
   * const { taskId } = await mia.insights.startAsync('grow');
   *
   * // Poll for completion
   * const poll = setInterval(async () => {
   *   const status = await mia.insights.getTaskStatus(taskId);
   *
   *   if (status.status === 'completed') {
   *     clearInterval(poll);
   *     displayResults(status.result);
   *   } else if (status.status === 'failed') {
   *     clearInterval(poll);
   *     showError(status.error);
   *   }
   * }, 2000);
   * ```
   */
  async startAsync(type: InsightType): Promise<AsyncTaskResult> {
    const response = await this.transport.request<{ task_id: string }>(
      `/api/insights/${type}/async`,
      { method: 'POST' }
    );
    return { taskId: response.task_id };
  }

  /**
   * Get the status of an async insight generation task.
   *
   * @param taskId - The task ID returned from `startAsync`
   * @returns Promise resolving to current task status
   *
   * @example
   * ```typescript
   * const status = await mia.insights.getTaskStatus(taskId);
   *
   * switch (status.status) {
   *   case 'pending': console.log('Queued...'); break;
   *   case 'running': console.log(`Progress: ${status.progress}%`); break;
   *   case 'completed': console.log('Done!', status.result); break;
   *   case 'failed': console.log('Error:', status.error); break;
   * }
   * ```
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    return this.transport.request(`/api/insights/task/${taskId}`);
  }

  /**
   * Cancel a running async task.
   *
   * @param taskId - The task ID to cancel
   *
   * @example
   * ```typescript
   * await mia.insights.cancelTask(taskId);
   * ```
   */
  async cancelTask(taskId: string): Promise<void> {
    await this.transport.request(`/api/insights/task/${taskId}`, {
      method: 'DELETE',
    });
  }

  // ==================== BRONZE TIER ====================

  /**
   * Get an instant "bronze" fact.
   *
   * Bronze facts are pre-computed highlights that return in under 1 second,
   * providing immediate value while full insights are being generated.
   *
   * @param highlightType - The type of highlight to fetch
   * @param dateRange - Time period for the fact (default: '30_days')
   * @returns Promise resolving to bronze highlight
   *
   * @example
   * ```typescript
   * const highlight = await mia.insights.getBronzeHighlight('grow', '30_days');
   * console.log(highlight.headline);  // "Conversions up 23%"
   * console.log(highlight.detail);    // "Your top campaign..."
   * ```
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
   * Get AI-generated followup analysis for a bronze fact.
   *
   * Takes a bronze fact and generates a deeper analysis with recommendations.
   *
   * @param factId - The fact ID to follow up on
   * @returns Promise resolving to followup analysis
   *
   * @example
   * ```typescript
   * const followup = await mia.insights.getBronzeFollowup(factId);
   * console.log(followup.analysis);
   * ```
   */
  async getBronzeFollowup(factId: string): Promise<BronzeFollowup> {
    return this.transport.request('/api/bronze/followup', {
      method: 'POST',
      body: { fact_id: factId },
    });
  }

  /**
   * Check if bronze data has been prefetched and is ready.
   *
   * @returns Promise resolving to prefetch status
   *
   * @example
   * ```typescript
   * const { ready, platforms } = await mia.insights.getPrefetchStatus();
   * if (ready) {
   *   const highlight = await mia.insights.getBronzeHighlight('grow');
   * }
   * ```
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
