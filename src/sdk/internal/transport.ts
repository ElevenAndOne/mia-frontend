/**
 * Transport Layer - Internal Only
 *
 * Handles HTTP requests with:
 * - Automatic X-Session-ID header injection
 * - Configurable retries (3 for GET, 0 for mutations)
 * - Timeout handling (30s default)
 * - HTTP error → structured SDK error mapping
 * - Session expiration detection (401)
 *
 * All failures THROW MiaSDKError - no global error handler.
 */

import type { StorageAdapter } from './storage';
import {
  type MiaSDKError,
  createSDKError,
  mapStatusToErrorCode,
  ErrorCodes,
} from '../types/errors';

export interface TransportConfig {
  baseUrl: string;
  storage: StorageAdapter;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onSessionExpired?: () => void;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  skipAuth?: boolean;
  retries?: number;
}

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

export class Transport {
  private baseUrl: string;
  private storage: StorageAdapter;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private onSessionExpired?: () => void;

  constructor(config: TransportConfig) {
    this.baseUrl = config.baseUrl;
    this.storage = config.storage;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retries = config.retries ?? DEFAULT_RETRIES;
    this.retryDelay = config.retryDelay ?? DEFAULT_RETRY_DELAY;
    this.onSessionExpired = config.onSessionExpired;
  }

  /**
   * Make an HTTP request with automatic session injection and error handling
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
      skipAuth = false,
      retries = method === 'GET' ? this.retries : 0,
    } = options;

    const url = this.buildUrl(path);
    const finalHeaders: Record<string, string> = { ...headers };

    // Inject session ID unless skipped
    if (!skipAuth) {
      const sessionId = this.storage.getSessionId();
      if (!sessionId) {
        throw createSDKError(ErrorCodes.NO_SESSION, 'No active session', {
          endpoint: path,
        });
      }
      finalHeaders['X-Session-ID'] = sessionId;
    }

    // Add Content-Type for JSON body
    if (body !== undefined) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    return this.executeWithRetry<T>(
      url,
      {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      timeout,
      retries,
      path,
      !skipAuth
    );
  }

  /**
   * Get the storage adapter (for services that need it)
   */
  getStorage(): StorageAdapter {
    return this.storage;
  }

  /**
   * Get the base URL (for SSE streaming)
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async executeWithRetry<T>(
    url: string,
    init: RequestInit,
    timeout: number,
    retriesLeft: number,
    endpoint: string,
    handleSessionExpired: boolean
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        const error = await this.parseErrorResponse(response, endpoint);

        // Check for session expiration (401)
        if (response.status === 401 && handleSessionExpired) {
          this.onSessionExpired?.();
          this.storage.clearSession();
          throw error;
        }

        // Retry on 5xx errors
        if (response.status >= 500 && retriesLeft > 0) {
          await this.delay(this.retryDelay);
          return this.executeWithRetry<T>(
            url,
            init,
            timeout,
            retriesLeft - 1,
            endpoint,
            handleSessionExpired
          );
        }

        throw error;
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        // If response is not JSON, return as-is wrapped
        return text as unknown as T;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw createSDKError(
          ErrorCodes.TIMEOUT,
          `Request timed out after ${timeout}ms`,
          { endpoint, timeout }
        );
      }

      // Re-throw SDK errors
      if (this.isMiaSDKError(error)) {
        throw error;
      }

      // Network errors - retry if possible
      if (
        error instanceof TypeError &&
        error.message.includes('fetch') &&
        retriesLeft > 0
      ) {
        await this.delay(this.retryDelay);
        return this.executeWithRetry<T>(
          url,
          init,
          timeout,
          retriesLeft - 1,
          endpoint,
          handleSessionExpired
        );
      }

      // Wrap unknown errors
      throw createSDKError(
        ErrorCodes.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Network request failed',
        { endpoint }
      );
    }
  }

  private buildUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.baseUrl}/${cleanPath}`;
  }

  private async parseErrorResponse(
    response: Response,
    endpoint: string
  ): Promise<MiaSDKError> {
    const code = mapStatusToErrorCode(response.status);

    try {
      const data = await response.json();
      const message = this.extractErrorMessage(data, response.status);

      return createSDKError(code, message, {
        endpoint,
        status: response.status,
        detail: data.detail,
      });
    } catch {
      return createSDKError(
        code,
        `HTTP ${response.status}: ${response.statusText}`,
        { endpoint, status: response.status }
      );
    }
  }

  private extractErrorMessage(data: unknown, status: number): string {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // Handle various error response formats
      if (typeof obj.detail === 'string') {
        return obj.detail;
      }
      if (typeof obj.message === 'string') {
        return obj.message;
      }
      if (typeof obj.error === 'string') {
        return obj.error;
      }

      // Handle validation errors (422)
      if (Array.isArray(obj.detail)) {
        const firstError = obj.detail[0];
        if (
          firstError &&
          typeof firstError === 'object' &&
          'msg' in firstError
        ) {
          return String(firstError.msg);
        }
      }
    }

    return `HTTP ${status}`;
  }

  private isMiaSDKError(error: unknown): error is MiaSDKError {
    return error instanceof Error && error.name === 'MiaSDKError';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
