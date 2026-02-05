/**
 * SDK Type Definitions - Barrel Export
 */

// Error types
export {
  type MiaSDKError,
  type ErrorCode,
  ErrorCodes,
  isMiaSDKError,
} from './errors';

// Session types
export type {
  User,
  AccountSummary,
  AuthenticatedPlatforms,
  ConnectedPlatforms,
  SessionData,
  RestoreSessionResult,
  ValidateSessionResult,
} from './session';

// Account types
export type {
  Account,
  MccAccount,
  GoogleAdsAccount,
  MetaAdAccount,
  GA4Property,
  LinkedGA4Property,
  SelectAccountResult,
  ListAccountsResult,
} from './accounts';

// Workspace types
export type {
  WorkspaceRole,
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
  InviteDetails,
  WorkspaceIntegrations,
} from './workspaces';

// Platform types
export type {
  PlatformId,
  PlatformStatus,
  AllPlatformStatuses,
  BrevoAccount,
  BrevoConnectResult,
  HubSpotAccount,
  HubSpotAuthUrlResult,
  MailchimpAccount,
  MailchimpAuthUrlResult,
  FacebookPage,
} from './platforms';

// Onboarding types
export {
  ONBOARDING_STEPS,
  type OnboardingStep,
  type OnboardingStatus,
  type BronzeFact,
  type AvailablePlatform,
  type GrowTaskStatus,
} from '../services/onboarding';
