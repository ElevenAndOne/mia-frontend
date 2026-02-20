/**
 * Central registry for all localStorage key strings.
 * Prevents typos and makes it easy to find all storage usage.
 */
export const StorageKey = {
  SESSION_ID: 'mia_session_id',
  LAST_USER_ID: 'mia_last_user_id',
  APP_STATE: 'mia_app_state',
  THEME: 'mia_theme',

  // OAuth flow
  OAUTH_PENDING: 'mia_oauth_pending',
  OAUTH_RETURN_URL: 'mia_oauth_return_url',
  OAUTH_PENDING_RETURN: 'mia_oauth_pending_return',
  PENDING_META_LINK: 'mia_pending_meta_link',

  // Invite flow
  PENDING_INVITE: 'mia_pending_invite',
  AUTO_ACCEPT_INVITE: 'mia_auto_accept_invite',

  // Auth return
  AUTH_RETURN_URL: 'mia_auth_return_url',

  // Onboarding (tenant-scoped — append `_${tenantId}`)
  ONBOARDING_COMPLETED_PREFIX: 'mia_onboarding_completed_',
  ONBOARDING_MESSAGES: 'mia_onboarding_messages',

  // UI state
  INTEGRATION_PROMPT_VISIT_COUNT: 'mia_integration_prompt_visit_count',
  CONFIG_GUIDANCE_VISIT_COUNT: 'mia_config_guidance_visit_count',
  INTEGRATION_HIGHLIGHT: 'mia_integration_highlight',
  KNOWN_CONNECTED_PLATFORMS: 'mia_known_connected_platforms',
} as const
