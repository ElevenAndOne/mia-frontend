/**
 * SDK Error Types
 *
 * All SDK methods throw MiaSDKError for failures.
 * Call sites catch and handle errors with contextually appropriate UI.
 */

export const ErrorCodes = {
  // Session errors
  NO_SESSION: 'NO_SESSION',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // HTTP errors
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // OAuth errors
  OAUTH_POPUP_BLOCKED: 'OAUTH_POPUP_BLOCKED',
  OAUTH_CANCELLED: 'OAUTH_CANCELLED',
  OAUTH_FAILED: 'OAUTH_FAILED',

  // General
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface MiaSDKError extends Error {
  name: 'MiaSDKError';
  code: ErrorCode;
  status?: number;
  endpoint?: string;
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
    const { status, endpoint, ...rest } = context;
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
