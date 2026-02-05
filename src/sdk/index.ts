/**
 * MIA SDK
 *
 * Production-grade TypeScript SDK for the MIA frontend.
 * Single interface between frontend and backend APIs.
 *
 * @example
 * ```typescript
 * import { createMiaClient, isMiaSDKError } from '@/sdk';
 *
 * const mia = createMiaClient({
 *   baseUrl: import.meta.env.VITE_API_BASE_URL,
 *   onSessionExpired: () => navigate('/login'),
 * });
 *
 * // Session restore
 * try {
 *   const { success, session } = await mia.session.restore();
 *   if (session?.isAuthenticated) {
 *     setUser(session.user);
 *   }
 * } catch (error) {
 *   if (isMiaSDKError(error)) {
 *     setAppError('Failed to restore session');
 *   }
 * }
 *
 * // OAuth flow
 * try {
 *   const result = await mia.auth.google.connect();
 *   if (result.success) {
 *     const { accounts } = await mia.accounts.list();
 *   }
 * } catch (error) {
 *   if (isMiaSDKError(error)) {
 *     if (error.code === 'OAUTH_POPUP_BLOCKED') {
 *       setError('Please allow popups');
 *     }
 *   }
 * }
 *
 * // Streaming insights
 * const stream = mia.insights.streamGrow({ dateRange: '30_days' });
 * for await (const chunk of stream) {
 *   if (chunk.type === 'text') {
 *     fullText += chunk.text;
 *   }
 * }
 * ```
 */

// Main client factory
export { createMiaClient, type MiaClient, type MiaClientConfig } from './client';

// Error types and utilities
export {
  type MiaSDKError,
  type ErrorCode,
  ErrorCodes,
  isMiaSDKError,
  createSDKError,
  mapStatusToErrorCode,
} from './types/errors';

// Session types
export type {
  User,
  SessionData,
  AccountSummary,
  RestoreSessionResult,
  ValidateSessionResult,
} from './types/session';

// Account types
export type {
  Account,
  MccAccount,
  GoogleAdsAccount,
  MetaAdAccount,
  GA4Property,
  ListAccountsResult,
  SelectAccountResult,
} from './types/accounts';

// Workspace types
export type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
  WorkspaceRole,
  WorkspaceIntegrations,
  InviteDetails,
} from './types/workspaces';

// Platform types
export type {
  PlatformId,
  PlatformStatus,
  AllPlatformStatuses,
  BrevoAccount,
  HubSpotAccount,
  MailchimpAccount,
  FacebookPage,
} from './types/platforms';

// SSE streaming types
export type { SSEChunk, SSEStreamOptions } from './internal/sse';

// Service-specific types that consumers may need
export type {
  GoogleConnectResult,
  GoogleConnectOptions,
} from './services/auth/google';

export type {
  MetaConnectResult,
  MetaConnectOptions,
} from './services/auth/meta';

export type {
  OnboardingStatus,
  OnboardingStep,
  BronzeFact,
  AvailablePlatform,
  GrowTaskStatus,
} from './services/onboarding';

export { ONBOARDING_STEPS } from './services/onboarding';

// Re-export service classes for advanced type usage (not for direct instantiation)
export type { SessionService } from './services/session';
export type { GoogleAuthService } from './services/auth/google';
export type { MetaAuthService } from './services/auth/meta';
export type { AccountsService } from './services/accounts';
export type { WorkspacesService } from './services/workspaces';
export type { PlatformsService } from './services/platforms';
export type { InsightsService } from './services/insights';
export type { ChatService } from './services/chat';
export type { OnboardingService } from './services/onboarding';

// React integration
export { MiaProvider, useMiaClient, type MiaProviderProps } from './react';
