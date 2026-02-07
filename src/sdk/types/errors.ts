/**
 * SDK Error Types
 *
 * All SDK methods throw `MiaSDKError` for failures. This provides a consistent
 * error handling pattern across the entire SDK.
 *
 * **Error Handling Pattern:**
 * ```typescript
 * import { isMiaSDKError, ErrorCodes } from '@/sdk';
 *
 * try {
 *   await mia.accounts.select(accountId);
 * } catch (error) {
 *   if (isMiaSDKError(error)) {
 *     switch (error.code) {
 *       case ErrorCodes.SESSION_EXPIRED:
 *         redirectToLogin();
 *         break;
 *       case ErrorCodes.RATE_LIMITED:
 *         showRetryMessage();
 *         break;
 *       default:
 *         showError(error.message);
 *     }
 *   }
 * }
 * ```
 */

/**
 * All possible error codes thrown by the SDK.
 *
 * Use these constants for reliable error code comparisons.
 *
 * @example
 * ```typescript
 * if (error.code === ErrorCodes.SESSION_EXPIRED) {
 *   redirectToLogin();
 * }
 * ```
 */
export const ErrorCodes = {
  // Session errors
  /** No session ID exists in storage */
  NO_SESSION: 'NO_SESSION',
  /** Session has expired (HTTP 401) */
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // HTTP errors
  /** Bad request (HTTP 400) */
  BAD_REQUEST: 'BAD_REQUEST',
  /** Forbidden - insufficient permissions (HTTP 403) */
  FORBIDDEN: 'FORBIDDEN',
  /** Resource not found (HTTP 404) */
  NOT_FOUND: 'NOT_FOUND',
  /** Validation error (HTTP 422) */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Rate limited - too many requests (HTTP 429) */
  RATE_LIMITED: 'RATE_LIMITED',
  /** Server error (HTTP 5xx) */
  SERVER_ERROR: 'SERVER_ERROR',

  // Network errors
  /** Network request failed */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Request timed out */
  TIMEOUT: 'TIMEOUT',

  // OAuth errors
  /** Browser blocked the OAuth popup */
  OAUTH_POPUP_BLOCKED: 'OAUTH_POPUP_BLOCKED',
  /** User cancelled OAuth flow */
  OAUTH_CANCELLED: 'OAUTH_CANCELLED',
  /** OAuth flow failed */
  OAUTH_FAILED: 'OAUTH_FAILED',

  // General
  /** Unknown/unexpected error */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Union type of all error codes.
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * SDK error type thrown by all SDK methods.
 *
 * Extends the standard Error with additional context for debugging
 * and error-specific handling.
 *
 * @example
 * ```typescript
 * if (isMiaSDKError(error)) {
 *   console.log('Code:', error.code);        // 'SESSION_EXPIRED'
 *   console.log('Message:', error.message);  // 'Session has expired'
 *   console.log('Status:', error.status);    // 401
 *   console.log('Endpoint:', error.endpoint); // '/api/accounts/list'
 * }
 * ```
 */
export interface MiaSDKError extends Error {
  /** Always 'MiaSDKError' - use for instanceof-like checks */
  name: 'MiaSDKError';
  /** Error code for programmatic handling */
  code: ErrorCode;
  /** HTTP status code (if applicable) */
  status?: number;
  /** API endpoint that failed */
  endpoint?: string;
  /** Additional context (varies by error) */
  context?: Record<string, unknown>;
}

/**
 * Type guard for safely catching and checking SDK errors
 *
 * @example
 * ```typescript
 * try {
 *   await mia.accounts.select(accountId);
 * } catch (error) {
 *   if (isMiaSDKError(error)) {
 *     if (error.code === 'SESSION_EXPIRED') {
 *       // Handle session expiration
 *     }
 *   }
 * }
 * ```
 */
export function isMiaSDKError(error: unknown): error is MiaSDKError {
  return error instanceof Error && error.name === 'MiaSDKError';
}

/**
 * Create a structured SDK error
 * Internal use only - not exported from public API
 */
export function createSDKError(
  code: ErrorCode,
  message: string,
  context?: {
    status?: number;
    endpoint?: string;
    [key: string]: unknown;
  }
): MiaSDKError {
  const error = new Error(message) as MiaSDKError;
  error.name = 'MiaSDKError';
  error.code = code;
  if (context?.status) error.status = context.status;
  if (context?.endpoint) error.endpoint = context.endpoint;
  if (context) {
    const rest = { ...context };
    delete rest.status;
    delete rest.endpoint;
    if (Object.keys(rest).length > 0) {
      error.context = rest;
    }
  }
  return error;
}

/**
 * Map HTTP status codes to error codes
 */
export function mapStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCodes.BAD_REQUEST;
    case 401:
      return ErrorCodes.SESSION_EXPIRED;
    case 403:
      return ErrorCodes.FORBIDDEN;
    case 404:
      return ErrorCodes.NOT_FOUND;
    case 422:
      return ErrorCodes.VALIDATION_ERROR;
    case 429:
      return ErrorCodes.RATE_LIMITED;
    default:
      return status >= 500 ? ErrorCodes.SERVER_ERROR : ErrorCodes.UNKNOWN_ERROR;
  }
}
