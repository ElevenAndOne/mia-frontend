/**
 * MiaClient Factory
 *
 * Creates and configures the SDK client with all services.
 * This is the main entry point for the SDK.
 */

import { Transport } from './internal/transport';
import {
  createStorageAdapter,
  getDefaultStorageBackend,
  type StorageAdapter,
  type StorageBackend,
} from './internal/storage';
import { SessionService } from './services/session';
import { GoogleAuthService } from './services/auth/google';
import { MetaAuthService } from './services/auth/meta';
import { AccountsService } from './services/accounts';
import { WorkspacesService } from './services/workspaces';
import { PlatformsService } from './services/platforms';
import { InsightsService } from './services/insights';
import { ChatService } from './services/chat';
import { OnboardingService } from './services/onboarding';

/**
 * Configuration options for creating a MiaClient
 */
export interface MiaClientConfig {
  /**
   * Base URL for the API (e.g., import.meta.env.VITE_API_BASE_URL)
   */
  baseUrl: string;

  /**
   * Storage backend for session persistence.
   * Can be localStorage, sessionStorage, or a custom implementation.
   * Defaults to localStorage if available, falls back to memory storage.
   */
  storage?: StorageBackend;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;

  /**
   * Number of retries for failed GET requests.
   * @default 3
   */
  retries?: number;

  /**
   * Delay between retries in milliseconds.
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Optional callback fired when any request returns 401 (session expired).
   * This is the ONLY cross-cutting callback - all other errors should be
   * handled at the call site using try/catch.
   *
   * This callback fires IN ADDITION TO throwing the error, so the call site
   * can still catch and handle it if needed.
   *
   * @example
   * ```typescript
   * const mia = createMiaClient({
   *   baseUrl: '/api',
   *   onSessionExpired: () => {
   *     clearAppState();
   *     navigate('/login');
   *   },
   * });
   * ```
   */
  onSessionExpired?: () => void;
}

/**
 * The MiaClient interface - provides access to all SDK services
 */
export interface MiaClient {
  /**
   * Session management
   * - restore(), validate(), clear(), selectMcc()
   */
  readonly session: SessionService;

  /**
   * Authentication services
   */
  readonly auth: {
    /**
     * Google OAuth
     * - connect(), logout(), getStatus(), getAdAccounts()
     */
    readonly google: GoogleAuthService;

    /**
     * Meta/Facebook OAuth
     * - connect(), logout(), getStatus(), getAvailableAccounts(), linkAccount()
     */
    readonly meta: MetaAuthService;
  };

  /**
   * Account management
   * - list(), select(), linkPlatform(), linkGoogleAds(), getMccAccounts()
   */
  readonly accounts: AccountsService;

  /**
   * Workspace management
   * - list(), create(), switch(), getMembers(), createInvite(), acceptInvite()
   */
  readonly workspaces: WorkspacesService;

  /**
   * Platform connections
   * - disconnect(), refresh(), getStatus(), getAllStatuses()
   * - .brevo, .hubspot, .mailchimp sub-services
   */
  readonly platforms: PlatformsService;

  /**
   * Insights and analytics
   * - generate(), getSummary(), streamGrow(), streamOptimize(), streamProtect()
   */
  readonly insights: InsightsService;

  /**
   * Chat functionality
   * - send(), quickQuestion()
   */
  readonly chat: ChatService;

  /**
   * Onboarding flow
   * - getStatus(), advanceStep(), complete(), skip()
   */
  readonly onboarding: OnboardingService;
}

/**
 * Create a new MiaClient instance
 *
 * @example
 * ```typescript
 * import { createMiaClient, isMiaSDKError } from './sdk';
 *
 * const mia = createMiaClient({
 *   baseUrl: import.meta.env.VITE_API_BASE_URL,
 *   onSessionExpired: () => navigate('/login'),
 * });
 *
 * // All methods throw MiaSDKError - handle at call site
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
 * ```
 */
export function createMiaClient(config: MiaClientConfig): MiaClient {
  // Create storage adapter with default fallback
  const storageBackend = config.storage ?? getDefaultStorageBackend();
  const storage: StorageAdapter = createStorageAdapter(storageBackend);

  // Create transport layer
  const transport = new Transport({
    baseUrl: config.baseUrl,
    storage,
    timeout: config.timeout,
    retries: config.retries,
    retryDelay: config.retryDelay,
    onSessionExpired: config.onSessionExpired,
  });

  // Instantiate all services
  const sessionService = new SessionService(transport, storage);
  const googleAuthService = new GoogleAuthService(transport, storage);
  const metaAuthService = new MetaAuthService(transport, storage);
  const accountsService = new AccountsService(transport);
  const workspacesService = new WorkspacesService(transport);
  const platformsService = new PlatformsService(transport);
  const insightsService = new InsightsService(transport, storage, config.baseUrl);
  const chatService = new ChatService(transport, storage);
  const onboardingService = new OnboardingService(transport, storage);

  // Return the client interface
  return {
    session: sessionService,
    auth: {
      google: googleAuthService,
      meta: metaAuthService,
    },
    accounts: accountsService,
    workspaces: workspacesService,
    platforms: platformsService,
    insights: insightsService,
    chat: chatService,
    onboarding: onboardingService,
  };
}
