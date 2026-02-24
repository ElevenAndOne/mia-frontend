# MIA Backend API Endpoints Documentation

This document provides a comprehensive reference for all API endpoints available in the MIA Backend, including parameters, responses, and implementation notes.

---

## Table of Contents

1. [Authentication & OAuth](#1-authentication--oauth)
2. [Account & Session Management](#2-account--session-management)
3. [Tenant/Workspace Management](#3-tenantworkspace-management)
4. [Data APIs](#4-data-apis)
5. [Insights & Analysis](#5-insights--analysis)
6. [Platform Management](#6-platform-management)
7. [Account Linking](#7-account-linking)
8. [Chat & Communication](#8-chat--communication)
9. [Onboarding](#9-onboarding)
10. [Internal APIs](#10-internal-apis)
11. [Status & Utility](#11-status--utility)

---

## 1. Authentication & OAuth

### Google OAuth

#### `GET /api/oauth/google/auth-url`
Get Google OAuth authentication URL with optional workspace context.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | No | Existing session ID |
| `frontend_origin` | string | query | No | Frontend origin for callback |
| `tenant_id` | string | query | No | Workspace context for credential storage |

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Notes:**
- If `tenant_id` is provided, credentials will be stored at tenant level (Phase 2 workspace isolation)
- Without `tenant_id`, credentials are stored at user level (onboarding flow)

---

#### `GET /api/oauth/google/status`
Get authentication status with session management.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Response:**
```json
{
  "authenticated": true,
  "user_id": "106540664695114193744",
  "email": "user@example.com",
  "name": "John Doe",
  "picture_url": "https://...",
  "has_google_ads": true,
  "has_ga4": true
}
```

---

#### `POST /api/oauth/google/complete`
Complete Google OAuth flow after user authorization.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | No | Existing session ID |
| `user_id` | string | query | No | User ID |

**Response:**
```json
{
  "success": true,
  "session_id": "new_or_existing_session_id",
  "user": {
    "user_id": "106540664695114193744",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Notes:**
- Creates or updates session with Google authentication
- Stores OAuth tokens for API access
- Phase 2: Stores credentials at tenant level if `tenant_id` provided

---

#### `POST /api/oauth/google/login`
Log in with Google OAuth credentials.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | No | Existing session ID |

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "session_id": "new_session_id"
}
```

---

#### `POST /api/oauth/google/logout`
Log out from Google OAuth and invalidate session.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Current session ID |

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `GET /api/oauth/google/callback`
Handle OAuth callback from Google with auto-close/redirect.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `code` | string | query | Yes | Authorization code from Google |
| `state` | string | query | No | State parameter |

**Response:** HTML page that auto-closes or redirects

---

#### `POST /api/oauth/google/exchange-token`
Exchange authorization code for access token.

**Request Body:**
```json
{
  "code": "authorization_code_from_google"
}
```

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | query | No | Workspace context |

**Response:**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user_info": {...}
}
```

---

#### `GET /api/oauth/google/user-info`
Get current user info.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | User ID |

**Response:**
```json
{
  "user_id": "106540664695114193744",
  "email": "user@example.com",
  "name": "John Doe"
}
```

---

#### `GET /api/oauth/google/ad-accounts`
Fetch user's Google Ads accounts - separates MCC accounts from regular accounts.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | Yes | User ID |

**Response:**
```json
{
  "mcc_accounts": [...],
  "regular_accounts": [...]
}
```

---

### Meta/Facebook OAuth

#### `GET /meta-oauth/auth-url`
Get Meta OAuth authentication URL (MCP flow).

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | query | No | Workspace context |

**Response:**
```json
{
  "auth_url": "https://www.facebook.com/v18.0/dialog/oauth?...",
  "state": "encrypted_state_token"
}
```

**Notes:**
- Default scopes include `ads_read`, `pages_show_list`, `pages_read_engagement`
- State token includes session_id and tenant_id for callback processing

---

#### `POST /meta-oauth/exchange-token`
Exchange authorization code for access token.

**Request Body:**
```json
{
  "code": "authorization_code_from_meta"
}
```

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | query | No | Workspace context |

**Response:**
```json
{
  "success": true,
  "access_token": "EAAxxxxx...",
  "user_id": "meta_user_id",
  "name": "Facebook User Name"
}
```

---

#### `GET /meta-oauth/callback`
Handle OAuth callback from Meta with auto-close/redirect.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `code` | string | query | Yes | Authorization code |
| `state` | string | query | No | State parameter |

---

#### `GET /meta-oauth/user-info`
Get current Meta user info.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | User ID |

---

#### `GET /meta-oauth/ad-accounts`
Fetch user's Meta ad accounts.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | User ID |

---

#### `GET /meta-oauth/status`
Get Meta authentication status.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | User ID |

---

#### `POST /meta-oauth/complete`
Complete OAuth flow - frontend compatibility.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | User ID |

---

#### `POST /meta-oauth/logout`
Logout user and revoke Meta tokens.

---

### Meta OAuth Enhanced (Session-Based)

#### `GET /api/oauth/meta/auth-url`
Get Meta OAuth authentication URL - Enhanced version with workspace context.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | query | No | Workspace context |
| `frontend_origin` | string | query | No | Frontend origin for callback |

**Response:**
```json
{
  "auth_url": "https://www.facebook.com/v18.0/dialog/oauth?...",
  "state": "encrypted_state_token"
}
```

---

#### `GET /api/oauth/meta/callback`
Handle OAuth callback with redirect.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `code` | string | query | Yes | Authorization code |
| `state` | string | query | No | State parameter |

---

#### `POST /api/oauth/meta/exchange-token`
Exchange Meta authorization code for access token via MCP server.

**Request Body:**
```json
{
  "code": "authorization_code_from_meta",
  "session_id": "active_session_id",
  "tenant_id": "optional_workspace_id"
}
```

---

#### `GET /api/oauth/meta/status`
Get Meta authentication status with session management.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Response:**
```json
{
  "authenticated": true,
  "user_id": "meta_user_id",
  "name": "Facebook User Name",
  "has_meta_ads": true
}
```

---

#### `GET /api/oauth/meta/user-info`
Get Meta user info with session management.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

---

#### `POST /api/oauth/meta/complete`
Complete Meta OAuth flow with session management.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

---

#### `GET /api/oauth/meta/accounts/available`
Get available Meta ad accounts for linking.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Response:**
```json
{
  "accounts": [
    {
      "id": "act_123456789",
      "name": "My Ad Account",
      "account_id": "123456789",
      "currency": "USD",
      "timezone_name": "America/New_York",
      "account_status": 1
    }
  ]
}
```

---

#### `POST /api/oauth/meta/accounts/link`
Link a Meta ad account to the current account mapping.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Request Body:**
```json
{
  "meta_account_id": "act_123456789",
  "account_id": "local_account_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Meta account linked successfully"
}
```

---

#### `POST /api/oauth/meta/logout`
Logout from Meta - clears MCP session and local database sessions.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

---

#### `GET /api/oauth/meta/credentials-status`
Check if Meta credentials actually exist in database.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID |

---

#### `GET /api/oauth/meta/organic/facebook-pages`
Get Facebook pages for organic posting.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `refresh` | boolean | query | No | Force refresh from API |

**Response:**
```json
{
  "pages": [
    {
      "id": "page_id",
      "name": "My Business Page",
      "category": "Business",
      "access_token": "page_access_token"
    }
  ]
}
```

---

#### `POST /api/oauth/meta/organic/link-page`
Link a Facebook page for organic content insights.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Request Body:**
```json
{
  "page_id": "facebook_page_id",
  "account_id": "local_account_id"
}
```

---

### Brevo OAuth

#### `POST /api/oauth/brevo/save-api-key`
Save Brevo API key for email marketing integration.

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "api_key": "xkeysib-xxxxx...",
  "account_id": "local_account_id"
}
```

**Response:**
```json
{
  "success": true,
  "validated": true,
  "account_info": {
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "company_name": "My Company"
  }
}
```

**Notes:**
- API key is validated against Brevo API before saving
- Supports multi-account: multiple Brevo accounts per user

---

#### `GET /api/oauth/brevo/status`
Check Brevo connection status.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |

**Response:**
```json
{
  "connected": true,
  "accounts": [
    {
      "id": 1,
      "email": "user@example.com",
      "is_primary": true,
      "is_active": true
    }
  ]
}
```

---

#### `DELETE /api/oauth/brevo/disconnect`
Disconnect Brevo integration from current account (soft delete).

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |
| `brevo_id` | integer | query | No | Specific Brevo account ID |

---

#### `GET /api/oauth/brevo/accounts`
Get all Brevo accounts for current account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |

---

#### `POST /api/oauth/brevo/select-account`
Select a Brevo account as primary.

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "brevo_account_id": 1,
  "account_id": "local_account_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Brevo account selected as primary"
}
```

---

### Brevo Session Management

#### `POST /api/brevo/connect`
Connect Brevo with API key.

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "api_key": "xkeysib-xxxxx..."
}
```

---

#### `POST /api/brevo/disconnect`
Disconnect Brevo.

**Request Body:**
```json
{
  "session_id": "active_session_id"
}
```

---

#### `POST /api/brevo/status`
Get Brevo connection status.

**Request Body:**
```json
{
  "session_id": "active_session_id"
}
```

---

### HubSpot OAuth

#### `GET /api/oauth/hubspot/auth-url`
Get HubSpot OAuth authentication URL.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |
| `tenant_id` | string | query | Yes | Workspace context |

---

#### `GET /api/oauth/hubspot/callback`
Handle OAuth callback with redirect.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `code` | string | query | Yes | Authorization code |
| `state` | string | query | Yes | State parameter |

---

#### `GET /api/oauth/hubspot/user-info`
Check if user has HubSpot connected.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | Yes | User ID |

---

#### `POST /api/oauth/hubspot/disconnect`
Disconnect HubSpot - requires session ownership verification.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | Yes | User ID |
| `session_id` | string | query | Yes | Session ID |

---

### HubSpot OAuth Enhanced

#### `POST /api/oauth/hubspot/link-portal`
Link HubSpot portal (multi-account support).

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |

**Request Body:**
```json
{
  "access_token": "hubspot_oauth_token",
  "refresh_token": "hubspot_refresh_token",
  "portal_id": "45874928",
  "account_id": "local_account_id"
}
```

**Response:**
```json
{
  "success": true,
  "portal_id": "45874928",
  "hub_name": "My HubSpot Portal"
}
```

---

#### `GET /api/oauth/hubspot/accounts`
Get linked HubSpot accounts.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |

**Response:**
```json
{
  "accounts": [
    {
      "id": 1,
      "portal_id": "45874928",
      "hub_name": "My HubSpot Portal",
      "is_primary": true,
      "is_active": true
    }
  ]
}
```

---

#### `POST /api/oauth/hubspot/select-account`
Select HubSpot account as primary.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `hubspot_id` | integer | query | Yes | HubSpot account ID |
| `session_id` | string | query | Yes | Session ID |

---

#### `DELETE /api/oauth/hubspot/disconnect`
Disconnect HubSpot integration.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID |
| `hubspot_id` | integer | query | No | Specific HubSpot account ID |

---

#### `GET /api/oauth/hubspot/status`
Get HubSpot connection status.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID |

---

### Mailchimp OAuth

#### `GET /api/oauth/mailchimp/auth-url`
Get Mailchimp OAuth authentication URL.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | query | Yes | Workspace context (required) |

---

#### `GET /api/oauth/mailchimp/callback`
Handle OAuth callback with redirect.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `code` | string | query | Yes | Authorization code |
| `state` | string | query | Yes | State parameter |

---

#### `GET /api/oauth/mailchimp/user-info`
Check if user has Mailchimp connected.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | Yes | User ID |

---

#### `POST /api/oauth/mailchimp/disconnect`
Disconnect Mailchimp account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | Yes | User ID |
| `session_id` | string | query | Yes | Session ID |
| `mailchimp_account_id` | string | query | No | Specific account ID |

---

### Mailchimp OAuth Enhanced

#### `GET /api/oauth/mailchimp/status`
Check Mailchimp connection status.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |

**Response:**
```json
{
  "connected": true,
  "accounts": [
    {
      "id": 1,
      "mailchimp_id": "abc123",
      "email": "user@example.com",
      "is_primary": true
    }
  ]
}
```

---

#### `GET /api/oauth/mailchimp/accounts`
Get all Mailchimp accounts.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID |

---

#### `POST /api/oauth/mailchimp/set-primary`
Set primary Mailchimp account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `mailchimp_id` | integer | query | Yes | Mailchimp account ID |
| `session_id` | string | query | Yes | Session ID |

**Response:**
```json
{
  "success": true,
  "message": "Primary Mailchimp account updated"
}
```

---

#### `DELETE /api/oauth/mailchimp/disconnect`
Disconnect Mailchimp integration.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID |
| `mailchimp_id` | integer | query | No | Specific account ID |

---

#### `DELETE /api/oauth/mailchimp/accounts/{mailchimp_id}`
Delete specific Mailchimp account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `mailchimp_id` | integer | path | Yes | Mailchimp account ID |
| `session_id` | string | query | Yes | Session ID |

---

## 2. Account & Session Management

### Session Management

#### `GET /api/session/validate`
Validate session and return session details with optional account sync.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID to validate |
| `sync_accounts` | boolean | query | No | Run account sync during validation (default: false) |

**Response:**
```json
{
  "valid": true,
  "session_id": "session_id",
  "user": {
    "user_id": "106540664695114193744",
    "name": "John Doe",
    "email": "user@example.com",
    "picture_url": "https://...",
    "has_seen_intro": true
  },
  "selected_account": {
    "id": "account_id",
    "name": "My Business",
    "google_ads_id": "7574136388",
    "ga4_property_id": "458016659",
    "meta_ads_id": "123456789",
    "selected_mcc_id": "7299783943"
  },
  "user_authenticated": {
    "google": true,
    "meta": true
  },
  "platforms": {
    "google": true,
    "meta": true,
    "brevo": false,
    "hubspot": true
  },
  "expires_at": "2026-02-28T10:30:00Z"
}
```

**Notes:**
- **Critical (Jan 2026):** Checks TENANT credentials if user has active workspace, otherwise USER credentials
- Distinguishes user authentication from platform connection for proper IntegrationsPage behavior
- `sync_accounts=true` validates accounts against APIs and removes stale entries

---

#### `POST /api/session/select-mcc`
Store the selected MCC ID for a session (Google Ads Manager Account).

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "mcc_id": "7299783943"
}
```

**Response:**
```json
{
  "success": true,
  "message": "MCC 7299783943 selected for session",
  "session_id": "session_id",
  "mcc_id": "7299783943"
}
```

**Notes:**
- **Critical:** Updates both mia.db session AND credentials.db with correct `login_customer_id`
- Ensures Google Ads API calls use user-selected MCC, not auto-detected one
- Phase 2: Also updates TENANT credentials if user has active workspace

---

#### `POST /api/accounts/sync`
Sync user accounts - validates DB entries against actual API data.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |

**Response:**
```json
{
  "success": true,
  "message": "Synced accounts for user",
  "results": {
    "google_ads": {"checked": 5, "removed": 1},
    "meta_ads": {"checked": 3, "removed": 0}
  }
}
```

**Notes:**
- Removes accounts that no longer exist in source APIs
- Call after login or when account list seems stale

---

#### `GET /api/accounts/sync-status`
Get current account status for debugging.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |

**Response:**
```json
{
  "success": true,
  "status": {
    "total_accounts": 5,
    "active_accounts": 4,
    "inactive_accounts": 1,
    "accounts": [...]
  }
}
```

---

#### `POST /api/admin/cleanup-orphan-accounts`
**ADMIN ONLY:** One-time cleanup of orphan Meta accounts.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `admin_key` | string | query | Yes | Admin API key (INTERNAL_API_KEY) |

**Response:**
```json
{
  "success": true,
  "message": "Orphan account cleanup complete",
  "results": {
    "orphans_found": 3,
    "orphans_removed": 3
  }
}
```

**Notes:**
- Removes Meta-only accounts that have no Google Ads linked
- Requires `INTERNAL_API_KEY` for authorization

---

## 3. Tenant/Workspace Management

### Workspace CRUD

#### `POST /api/tenants`
Create new workspace/tenant.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Request Body:**
```json
{
  "name": "My Agency Workspace"
}
```

**Response:**
```json
{
  "success": true,
  "tenant": {
    "id": "tenant_uuid",
    "name": "My Agency Workspace",
    "slug": "my-agency-workspace",
    "created_at": "2026-01-28T10:00:00Z",
    "owner_id": "user_id"
  }
}
```

**Notes:**
- Creator becomes owner with OWNER role
- Slug is auto-generated from name

---

#### `GET /api/tenants`
List all workspaces for authenticated user.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Response:**
```json
{
  "workspaces": [
    {
      "id": "tenant_uuid",
      "name": "My Agency Workspace",
      "slug": "my-agency-workspace",
      "role": "owner",
      "is_active": true
    }
  ]
}
```

---

#### `POST /api/tenants/switch`
Switch to different workspace.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Request Body:**
```json
{
  "tenant_id": "target_tenant_id"
}
```

**Response:**
```json
{
  "success": true,
  "active_tenant_id": "target_tenant_id",
  "tenant_name": "Target Workspace"
}
```

---

#### `GET /api/tenants/current`
Get current active workspace.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Response:**
```json
{
  "tenant": {
    "id": "tenant_uuid",
    "name": "My Agency Workspace",
    "slug": "my-agency-workspace",
    "role": "owner"
  }
}
```

---

#### `GET /api/tenants/{tenant_id}`
Get workspace details.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | path | Yes | Workspace ID |

**Response:**
```json
{
  "id": "tenant_uuid",
  "name": "My Agency Workspace",
  "slug": "my-agency-workspace",
  "created_at": "2026-01-28T10:00:00Z",
  "member_count": 3,
  "connected_platforms": ["google_ads", "meta_ads"]
}
```

---

#### `PUT /api/tenants/{tenant_id}`
Update workspace.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | path | Yes | Workspace ID |

**Request Body:**
```json
{
  "name": "Updated Workspace Name"
}
```

---

#### `DELETE /api/tenants/{tenant_id}`
Delete workspace.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | path | Yes | Workspace ID |

---

### Workspace Members

#### `GET /api/tenants/{tenant_id}/members`
List workspace members.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | path | Yes | Workspace ID |

**Response:**
```json
{
  "members": [
    {
      "user_id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "owner",
      "joined_at": "2026-01-28T10:00:00Z"
    },
    {
      "user_id": "user_id_2",
      "email": "member@example.com",
      "name": "Jane Smith",
      "role": "member",
      "joined_at": "2026-01-29T10:00:00Z"
    }
  ]
}
```

**Notes:**
- Roles: `owner`, `admin`, `member`

---

#### `DELETE /api/tenants/{tenant_id}/members/{user_id}`
Remove member from workspace.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | path | Yes | Workspace ID |
| `user_id` | string | path | Yes | User ID to remove |

---

#### `PUT /api/tenants/{tenant_id}/members/{user_id}/role`
Update member role.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | path | Yes | Workspace ID |
| `user_id` | string | path | Yes | User ID |

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Member role updated to admin"
}
```

**Notes:**
- Requires `owner` or `admin` role to update
- Cannot demote yourself if you're the only owner

---

### Workspace Invites

#### `POST /api/tenants/{tenant_id}/invites`
Create workspace invite.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | path | Yes | Workspace ID |

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

**Response:**
```json
{
  "success": true,
  "invite": {
    "id": "invite_uuid",
    "email": "newmember@example.com",
    "role": "member",
    "invite_token": "abc123xyz",
    "expires_at": "2026-02-04T10:00:00Z"
  }
}
```

**Notes:**
- Invite expires in 7 days by default
- Email is sent if email service is configured

---

#### `GET /api/tenants/{tenant_id}/invites`
List workspace invites.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | path | Yes | Workspace ID |

---

#### `DELETE /api/tenants/{tenant_id}/invites/{invite_id}`
Revoke workspace invite.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | path | Yes | Workspace ID |
| `invite_id` | string | path | Yes | Invite ID |

---

#### `GET /api/tenants/invites/{invite_id}/details`
Get invite details (public - for invite acceptance page).

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `invite_id` | string | path | Yes | Invite ID |

---

#### `POST /api/tenants/invites/{invite_id}/accept`
Accept workspace invite.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `invite_id` | string | path | Yes | Invite ID |

**Response:**
```json
{
  "success": true,
  "workspace": {
    "id": "tenant_uuid",
    "name": "My Agency Workspace"
  },
  "role": "member"
}
```

---

#### `GET /api/tenants/invites/pending`
Get pending invites for current user.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

---

#### `GET /api/tenants/{tenant_id}/integrations`
Get workspace platform integrations.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |
| `tenant_id` | string | path | Yes | Workspace ID |

**Response:**
```json
{
  "integrations": {
    "google_ads": {
      "connected": true,
      "account_id": "7574136388",
      "connected_by": "user@example.com",
      "connected_at": "2026-01-28T10:00:00Z"
    },
    "meta_ads": {
      "connected": true,
      "account_id": "act_123456789"
    },
    "brevo": {
      "connected": false
    },
    "hubspot": {
      "connected": true,
      "portal_id": "45874928"
    }
  }
}
```

---

## 4. Data APIs

### Google Ads API

#### `GET /advertising/accounts`
List all accessible Google Ads customer accounts.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context (Phase 2) |

**Response:**
```json
[
  {
    "id": "7574136388",
    "name": "My Business Account",
    "currency_code": "USD",
    "time_zone": "America/New_York",
    "resource_name": "customers/7574136388"
  }
]
```

**Notes:**
- Phase 2: If `tenant_id` provided, uses workspace credentials
- Uses Google Ads API v21

---

#### `GET /advertising/accounts/{customer_id}/campaigns`
Get campaigns for a specific customer account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `customer_id` | string | path | Yes | Google Ads customer ID |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `include_metrics` | boolean | query | No | Include campaign metrics (default: true) |

**Response:**
```json
[
  {
    "id": "12345678901",
    "name": "Summer Sale Campaign",
    "status": "ENABLED",
    "resource_name": "customers/7574136388/campaigns/12345678901",
    "metrics": {
      "impressions": 50000,
      "clicks": 1500,
      "cost": 250.50,
      "conversions": 45.0,
      "ctr": 0.03,
      "average_cpc": 0.167,
      "cost_per_conversion": 5.57
    }
  }
]
```

---

#### `GET /advertising/accounts/{customer_id}/performance`
Get account performance metrics for a date range.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `customer_id` | string | path | Yes | Google Ads customer ID |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | query | Yes | End date (YYYY-MM-DD) |

**Response:**
```json
{
  "customer_id": "7574136388",
  "date_range": {"start": "2026-01-01", "end": "2026-01-28"},
  "totals": {
    "impressions": 150000,
    "clicks": 4500,
    "cost": 750.00,
    "conversions": 135.0,
    "ctr": 3.0,
    "average_cpc": 0.167,
    "cost_per_conversion": 5.56
  },
  "daily_breakdown": [
    {
      "date": "2026-01-01",
      "impressions": 5000,
      "clicks": 150,
      "cost": 25.00,
      "conversions": 4.5
    }
  ]
}
```

---

#### `GET /advertising/health`
Check if Google Ads API integration is properly configured.

**Response:**
```json
{
  "status": "healthy",
  "api_version": "v21"
}
```

---

### Meta Ads API

#### `GET /meta-ads/accounts`
Get all accessible Meta ad accounts.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |

**Response:**
```json
[
  {
    "id": "act_123456789",
    "name": "My Ad Account",
    "account_id": "123456789",
    "currency": "USD",
    "timezone_name": "America/New_York",
    "account_status": 1
  }
]
```

---

#### `GET /meta-ads/accounts/{account_id}/campaigns`
Get campaigns for a specific Meta ad account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `account_id` | string | path | Yes | Meta ad account ID (with act_ prefix) |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `include_metrics` | boolean | query | No | Include campaign metrics (default: true) |

**Response:**
```json
[
  {
    "id": "23456789012",
    "name": "Lead Generation Campaign",
    "status": "ACTIVE",
    "objective": "LEAD_GENERATION",
    "daily_budget": "5000",
    "lifetime_budget": null,
    "metrics": {
      "impressions": 25000,
      "clicks": 800,
      "spend": 150.00,
      "reach": 20000,
      "frequency": 1.25,
      "ctr": 3.2,
      "cpc": 0.188,
      "cpm": 6.00,
      "actions": [...]
    }
  }
]
```

---

#### `GET /meta-ads/accounts/{account_id}/performance`
Get Meta account performance metrics.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `account_id` | string | path | Yes | Meta ad account ID |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | query | Yes | End date (YYYY-MM-DD) |

**Response:**
```json
{
  "impressions": 100000,
  "clicks": 3200,
  "spend": 600.00,
  "reach": 80000,
  "frequency": 1.25,
  "ctr": 3.2,
  "cpc": 0.188,
  "cpm": 6.00,
  "cpp": 7.50
}
```

---

#### `GET /meta-ads/accounts/{account_id}/adsets`
Get ad sets for a Meta ad account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `account_id` | string | path | Yes | Meta ad account ID |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `campaign_id` | string | query | No | Filter by campaign ID |

**Response:**
```json
[
  {
    "id": "34567890123",
    "name": "Lookalike Audience 1%",
    "status": "ACTIVE",
    "campaign_id": "23456789012",
    "daily_budget": "2000",
    "lifetime_budget": null
  }
]
```

---

#### `GET /meta-ads/accounts/{account_id}/ads`
Get ads for a Meta ad account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `account_id` | string | path | Yes | Meta ad account ID |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `adset_id` | string | query | No | Filter by ad set ID |

**Response:**
```json
[
  {
    "id": "45678901234",
    "name": "Ad Creative 1",
    "status": "ACTIVE",
    "adset_id": "34567890123",
    "creative": {...}
  }
]
```

---

### Google Analytics API

#### `GET /analytics/properties`
List GA4 properties accessible to the user.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |

**Response:**
```json
[
  {
    "property_id": "458016659",
    "display_name": "My Website",
    "currency_code": "USD",
    "time_zone": "America/New_York"
  }
]
```

---

#### `GET /analytics/properties/{property_id}/metrics`
Get GA4 metrics for a property.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `property_id` | string | path | Yes | GA4 property ID |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | query | Yes | End date (YYYY-MM-DD) |

**Response:**
```json
{
  "sessions": 50000,
  "users": 35000,
  "new_users": 20000,
  "page_views": 150000,
  "engagement_rate": 0.65,
  "average_session_duration": 180.5,
  "conversions": 500
}
```

**Notes:**
- Implements token refresh retry logic for expired tokens

---

#### `GET /analytics/properties/{property_id}/top-pages`
Get top pages for a GA4 property.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `property_id` | string | path | Yes | GA4 property ID |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | Yes | Start date |
| `end_date` | string | query | Yes | End date |
| `limit` | integer | query | No | Number of results (default: 10) |

---

#### `GET /analytics/properties/{property_id}/traffic-sources`
Get traffic sources for a GA4 property.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `property_id` | string | path | Yes | GA4 property ID |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | Yes | Start date |
| `end_date` | string | query | Yes | End date |

---

#### `GET /analytics/properties/{property_id}/conversions`
Get conversions for a GA4 property.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `property_id` | string | path | Yes | GA4 property ID |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | Yes | Start date |
| `end_date` | string | query | Yes | End date |

---

#### `GET /analytics/properties/{property_id}/realtime`
Get real-time GA4 data.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `property_id` | string | path | Yes | GA4 property ID |
| `user_id` | string | query | Yes | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |

**Response:**
```json
{
  "active_users": 42,
  "active_1_min": 15,
  "active_5_min": 30,
  "top_pages": [
    {"page": "/", "users": 10},
    {"page": "/products", "users": 8}
  ]
}
```

---

## 5. Insights & Analysis

### Quick Insights (Silver Tier)

#### `POST /api/quick-insights/grow`
Generate Grow insights (growth opportunities) with AI analysis.

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "user_id": "optional_user_id",
  "date_range": "30_days",
  "platforms": ["google_ads", "meta", "ga4"]
}
```

**Response:**
```json
{
  "success": true,
  "insight_type": "grow",
  "platforms_analyzed": ["google_ads", "meta", "ga4"],
  "date_range": {"start": "2025-12-29", "end": "2026-01-28"},
  "insights": "Based on your data, here are growth opportunities...",
  "response_time_ms": 3500
}
```

**Notes:**
- Uses Claude AI for analysis via MCP integration
- Supports platform toggling from UI
- Date range options: `7_days`, `14_days`, `30_days`, `90_days`
- Redis caching: Platform data cached 30min, Claude responses cached 2hrs
- Rate limited: 10 requests/minute

---

#### `POST /api/quick-insights/grow/stream`
Stream Grow insights with Server-Sent Events (SSE).

**Request Body:** Same as `/api/quick-insights/grow`

**Response:** SSE stream with chunks:
```
data: {"chunk": "Based on your", "done": false}
data: {"chunk": " marketing data...", "done": false}
data: {"chunk": "", "done": true, "total_tokens": 450}
```

**Notes:**
- Preferred for better UX - shows response as it generates
- Same caching and rate limiting as non-streaming endpoint

---

#### `POST /api/quick-insights/optimize`
Generate Optimize insights (optimization recommendations).

**Request Body:** Same as `/api/quick-insights/grow`

**Response:** Same structure as grow insights

---

#### `POST /api/quick-insights/optimize/stream`
Stream Optimize insights with SSE.

**Request Body:** Same as `/api/quick-insights/grow`

---

#### `POST /api/quick-insights/protect`
Generate Protect insights (risk identification).

**Request Body:** Same as `/api/quick-insights/grow`

**Response:** Same structure as grow insights

---

#### `POST /api/quick-insights/protect/stream`
Stream Protect insights with SSE.

**Request Body:** Same as `/api/quick-insights/grow`

---

#### `POST /api/quick-insights/summary`
Generate Summary insights (executive overview).

**Request Body:** Same as `/api/quick-insights/grow`

**Response:** Same structure as grow insights

---

### Intelligence Snapshot

#### `POST /api/snapshot/generate`
Generate intelligence snapshot with all platform data.

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "date_range": "30_days",
  "platforms": ["google_ads", "meta", "ga4"]
}
```

**Response:**
```json
{
  "success": true,
  "snapshot": {
    "generated_at": "2026-01-28T10:00:00Z",
    "date_range": {...},
    "platforms": {...},
    "insights": "..."
  }
}
```

---

#### `POST /api/snapshot/stream`
Stream intelligence snapshot generation with SSE.

**Request Body:** Same as `/api/snapshot/generate`

**Response:** SSE stream

---

### Bronze Insights (Bronze Tier)

#### `POST /api/bronze/highlight`
Get instant bronze facts (template-based, <1 second response).

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "highlight_type": "grow",
  "date_range": "30_days"
}
```

**Response:**
```json
{
  "success": true,
  "facts": [
    {
      "metric": "CTR",
      "value": "3.2%",
      "trend": "up",
      "change": "+0.5%",
      "period": "vs last 30 days"
    },
    {
      "metric": "Conversions",
      "value": "145",
      "trend": "up",
      "change": "+23%"
    }
  ],
  "response_time_ms": 150
}
```

**Notes:**
- Template-based, no AI - sub-second response
- Great for quick data loading while Silver insights generate

---

#### `POST /api/bronze/followup`
Follow up on bronze fact with AI analysis.

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "fact_context": {
    "metric": "CTR",
    "value": "3.2%",
    "trend": "up"
  },
  "question": "Why did CTR improve?"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": "Your CTR improved because..."
}
```

---

#### `GET /api/bronze/prefetch-status`
Get prefetch status for bronze data.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID |

---

### Async Insights

#### `POST /api/insights/grow/async`
Start Grow insights generation in background.

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "date_range": "30_days",
  "platforms": ["google_ads", "meta"]
}
```

**Response:**
```json
{
  "success": true,
  "task_id": "task_uuid",
  "status": "pending",
  "message": "Task queued for processing"
}
```

---

#### `POST /api/insights/optimize/async`
Start Optimize insights generation in background.

**Request Body:** Same as grow/async

---

#### `POST /api/insights/protect/async`
Start Protect insights generation in background.

**Request Body:** Same as grow/async

---

#### `GET /api/insights/task/{task_id}`
Poll for async task status.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `task_id` | string | path | Yes | Task ID from async request |

**Response (pending):**
```json
{
  "task_id": "task_uuid",
  "status": "processing",
  "progress": 45,
  "message": "Analyzing Google Ads data..."
}
```

**Response (complete):**
```json
{
  "task_id": "task_uuid",
  "status": "completed",
  "result": {
    "insights": "Based on your data...",
    "platforms_analyzed": ["google_ads", "meta"]
  },
  "completed_at": "2026-01-28T10:30:00Z"
}
```

---

#### `DELETE /api/insights/task/{task_id}`
Cancel a running task (best effort).

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `task_id` | string | path | Yes | Task ID |

---

### Website Analytics

#### `POST /user-journey-analysis`
Analyze user journey from ads to conversions.

**Request Body (Form):**
```json
{
  "user_id": "user_id",
  "start_date": "2026-01-01",
  "end_date": "2026-01-28"
}
```

**Response:**
```json
{
  "user_id": "user_id",
  "analysis_period": "2026-01-01 to 2026-01-28",
  "funnel_overview": {
    "ad_clicks": 5000,
    "website_sessions": 4500,
    "engaged_sessions": 3000,
    "conversions": 150
  },
  "conversion_rates": {
    "click_to_session": 90.0,
    "session_to_engagement": 66.7,
    "session_to_conversion": 3.3
  },
  "drop_off_analysis": {...},
  "traffic_source_performance": {...}
}
```

---

#### `POST /drop-off-analysis`
Identify user drop-off points in conversion funnel.

**Request Body (Form):**
```json
{
  "user_id": "user_id",
  "start_date": "2026-01-01",
  "end_date": "2026-01-28",
  "funnel_steps": ["landing_page", "product_page", "cart", "checkout", "purchase"]
}
```

**Response:**
```json
{
  "user_id": "user_id",
  "analysis_period": "2026-01-01 to 2026-01-28",
  "funnel_steps": [...],
  "funnel_performance": {...},
  "drop_off_reasons": {
    "low_engagement_rate": {
      "issue": "Low engagement rate traffic sources",
      "affected_sources": {...},
      "likely_reasons": [...],
      "recommended_actions": [...]
    }
  },
  "technical_issues": {...}
}
```

---

#### `POST /conversion-funnel-optimization`
Generate funnel optimization recommendations.

**Request Body (Form):**
```json
{
  "user_id": "user_id",
  "start_date": "2026-01-01",
  "end_date": "2026-01-28"
}
```

---

#### `POST /traffic-quality-analysis`
Analyze traffic quality across sources.

**Request Body (Form):**
```json
{
  "user_id": "user_id",
  "start_date": "2026-01-01",
  "end_date": "2026-01-28"
}
```

---

### Clean Website Analytics

#### `POST /journey-analysis`
Analyze user journey from ads to conversions (clean version).

**Request Body (Form):**
```json
{
  "request": "{\"user_id\": \"...\", \"start_date\": \"...\", \"end_date\": \"...\"}"
}
```

---

#### `POST /funnel-optimization`
Generate funnel optimization recommendations (clean version).

**Request Body (Form):** Same structure

---

### Ad Insights

#### `POST /ad-performance-analysis`
Comprehensive ad performance analysis.

**Request Body (Form):**
```json
{
  "user_id": "user_id",
  "start_date": "2026-01-01",
  "end_date": "2026-01-28",
  "data_sources": ["meta_ads", "google_ads"]
}
```

**Response:**
```json
{
  "user_id": "user_id",
  "analysis_period": "2026-01-01 to 2026-01-28",
  "auto_detected_dates": false,
  "data_sources": ["meta_ads", "google_ads"],
  "total_records": 150,
  "top_performers": {...},
  "bottom_performers": {...},
  "campaign_summary": {...},
  "platform_comparison": {...},
  "overall_metrics": {
    "total_spend": 5000.00,
    "total_conversions": 200,
    "average_ctr": 2.5,
    "average_cpc": 1.50,
    "overall_roas": 4.0
  }
}
```

**Notes:**
- Auto-detects date range if not provided
- Identifies top 10% and bottom 10% performers

---

#### `POST /campaign-comparison`
Compare performance across campaigns.

**Request Body (Form):** Same structure as ad-performance-analysis

---

#### `POST /ad-recommendations`
Generate actionable ad optimization recommendations.

**Request Body (Form):** Same structure

---

#### `POST /performance-trends`
Analyze performance trends over time.

**Request Body (Form):** Same structure

---

#### `POST /optimization-action-plan`
Generate detailed optimization action plan.

**Request Body (Form):**
```json
{
  "user_id": "user_id",
  "start_date": "2026-01-01",
  "end_date": "2026-01-28",
  "budget_increase_limit": 50
}
```

**Response:**
```json
{
  "user_id": "user_id",
  "analysis_period": "2026-01-01 to 2026-01-28",
  "action_plan": {
    "immediate_actions": [
      {
        "action": "PAUSE_ADS",
        "priority": "CRITICAL",
        "title": "Pause 5 underperforming ads",
        "specific_steps": [...],
        "ads_to_pause": [...],
        "expected_impact": "Save $500/month",
        "time_required": "15 minutes"
      }
    ],
    "weekly_actions": [...],
    "monthly_actions": [...],
    "expected_overall_impact": {
      "current_monthly_spend": "$5000.00",
      "estimated_monthly_savings": "$500.00",
      "projected_new_roas": "4.5"
    }
  },
  "implementation_priority": "Execute in order: Immediate → This Week → This Month"
}
```

---

#### `POST /budget-reallocation-plan`
Generate budget reallocation recommendations.

**Request Body (Form):** Same structure as optimization-action-plan

---

#### `POST /debug-ad-data-availability`
Debug endpoint to check ad data availability.

**Request Body (Form):**
```json
{
  "user_id": "user_id"
}
```

---

#### `POST /file-insights`
Analyze uploaded CSV files for insights.

**Request:** Multipart form data
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `meta_csv` | file | Yes | Meta Ads CSV export |
| `google_csv` | file | Yes | Google Ads CSV export |

**Response:**
```json
{
  "summary": {
    "total_records": 500,
    "data_sources": {
      "meta_ads_records": 250,
      "google_ads_records": 250
    },
    "total_campaigns": 15,
    "total_spend": 10000.00,
    "overall_roas": 3.5
  },
  "performance_analysis": {...},
  "campaign_comparison": {...},
  "recommendations": [...],
  "action_plan": {...},
  "budget_reallocation": {...},
  "trends_analysis": {...}
}
```

**Notes:**
- Supports multiple CSV encodings (UTF-8, UTF-16, Windows-1252)
- Auto-detects separator (comma, semicolon)
- Maps column names from various export formats

---

### Clean Ad Insights

#### `POST /ad-performance`
Comprehensive ad performance analysis (clean version).

**Request Body (Form):**
```json
{
  "request": "{\"user_id\": \"...\", ...}"
}
```

---

#### `POST /campaign-comparison`
Compare performance across campaigns (clean version).

---

#### `POST /ad-recommendations`
Generate ad optimization recommendations (clean version).

---

#### `POST /optimization-action-plan`
Generate optimization action plan (clean version).

---

### Clean Insights

#### `POST /clean-insights`
Generate clean insights from uploaded files.

**Request:** Multipart form data
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ga4_file` | file | No | GA4 data file |

---

#### `GET /clean-insights/example`
Get usage examples for the clean insights endpoint.

---

### Comprehensive Insights

#### `POST /comprehensive-insights`
Generate comprehensive cross-platform insights.

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "date_range": "30_days",
  "platforms": ["google_ads", "meta", "ga4"]
}
```

---

### EDA (Exploratory Data Analysis)

#### `POST /eda`
Run exploratory data analysis on uploaded CSV.

**Request:** Multipart form data
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `file` | file | Yes | CSV file to analyze |

**Response:**
```json
{
  "eda_report_path": "/tmp/eda_report.html"
}
```

**Notes:**
- Uses ydata-profiling for comprehensive EDA
- Returns path to HTML report

---

#### `POST /ga4-data-availability`
Check GA4 data availability.

**Request Body (Form):**
```json
{
  "user_id": "user_id"
}
```

---

#### `POST /complete-website-insights`
Generate comprehensive GA4 insights.

**Request Body (Form):**
```json
{
  "user_id": "user_id",
  "start_date": "2026-01-01",
  "end_date": "2026-01-28"
}
```

**Response:**
```json
{
  "user_id": "user_id",
  "analysis_period": "2026-01-01 to 2026-01-28",
  "data_summary": {
    "total_sessions": 50000,
    "total_users": 35000,
    "total_conversions": 500,
    "overall_engagement_rate": 0.65
  },
  "comprehensive_insights": {
    "overview": {...},
    "drop_off_analysis": {...},
    "traffic_source_analysis": {...},
    "user_behavior_patterns": {...},
    "content_performance": {...},
    "device_performance": {...},
    "actionable_recommendations": [...],
    "optimization_opportunities": [...]
  }
}
```

---

## 6. Platform Management

#### `POST /api/platform/{platform}/disconnect`
Disconnect a platform from the account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `platform` | string | path | Yes | Platform name: `google`, `meta`, `brevo`, `hubspot`, `mailchimp` |
| `X-Session-ID` | string | header | Yes | Active session ID |

**Response:**
```json
{
  "success": true,
  "message": "Platform meta disconnected successfully"
}
```

---

#### `POST /api/platform/{platform}/refresh`
Refresh platform connection/data.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `platform` | string | path | Yes | Platform name |
| `X-Session-ID` | string | header | Yes | Active session ID |

---

#### `GET /api/platform/{platform}/status`
Get platform connection status.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `platform` | string | path | Yes | Platform name |
| `X-Session-ID` | string | header | Yes | Active session ID |

**Response:**
```json
{
  "connected": true,
  "account_id": "123456789",
  "account_name": "My Ad Account",
  "last_sync": "2026-01-28T10:00:00Z"
}
```

---

## 7. Account Linking

#### `GET /api/accounts/available`
Get available accounts for linking.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Response:**
```json
{
  "accounts": [
    {
      "account_id": "account_uuid",
      "account_name": "My Business",
      "google_ads_id": "7574136388",
      "ga4_property_id": "458016659",
      "meta_ads_id": null,
      "is_active": true
    }
  ]
}
```

---

#### `POST /api/accounts/select`
Select account for use.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Request Body:**
```json
{
  "account_id": "account_uuid"
}
```

**Response:**
```json
{
  "success": true,
  "selected_account": {
    "account_id": "account_uuid",
    "account_name": "My Business"
  }
}
```

---

#### `POST /api/accounts/link-platform`
Manually link a platform to an account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Request Body:**
```json
{
  "account_id": "account_uuid",
  "platform": "meta",
  "platform_account_id": "act_123456789"
}
```

---

#### `POST /api/accounts/link-google`
Link Google account to local account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Request Body:**
```json
{
  "account_id": "account_uuid",
  "google_ads_id": "7574136388",
  "ga4_property_id": "458016659"
}
```

---

#### `POST /api/google/accounts/link`
Link Google Ads account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Request Body:**
```json
{
  "customer_id": "7574136388",
  "account_id": "account_uuid"
}
```

---

#### `GET /api/google/accounts/discovered`
Get discovered Google accounts from API.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

---

#### `POST /api/ga4/refresh`
Refresh GA4 properties for the account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | Yes | Active session ID |

**Response:**
```json
{
  "success": true,
  "properties": [
    {
      "property_id": "458016659",
      "display_name": "My Website"
    }
  ]
}
```

---

#### `GET /api/account/platform-preferences`
Get saved platform preferences for current account.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID |

---

#### `PUT /api/account/platform-preferences`
Save platform preferences for current account.

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "preferences": {
    "default_google_ads_id": "7574136388",
    "default_ga4_property_id": "458016659"
  }
}
```

---

## 8. Chat & Communication

#### `POST /api/chat`
Send chat message with AI analysis (MCP integration).

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "message": "How did my campaigns perform last week?",
  "context": {
    "include_google_ads": true,
    "include_meta_ads": true,
    "include_ga4": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "Based on your marketing data from the past week...",
  "data_sources_used": ["google_ads", "meta_ads", "ga4"],
  "tokens_used": 850
}
```

**Notes:**
- Rate limited: 20 requests/minute per user
- Uses Claude AI via MCP integration
- Fetches real-time data from connected platforms

---

## 9. Onboarding

#### `GET /api/onboarding/status`
Get current onboarding state.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |

**Response:**
```json
{
  "current_step": "connect_platforms",
  "completed_steps": ["create_account", "welcome"],
  "pending_steps": ["connect_platforms", "select_account", "first_insight"],
  "progress_percentage": 40,
  "can_skip": true
}
```

---

#### `POST /api/onboarding/update-step`
Update onboarding step status.

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "step": "connect_platforms",
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "next_step": "select_account"
}
```

---

#### `POST /api/onboarding/advance`
Advance to next onboarding step.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID |

---

#### `POST /api/onboarding/complete`
Mark onboarding as complete.

**Request Body:**
```json
{
  "session_id": "active_session_id"
}
```

---

#### `POST /api/onboarding/skip`
Skip onboarding process.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID |

---

#### `GET /api/onboarding/available-platforms`
Get available platforms for onboarding.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Session ID |

**Response:**
```json
{
  "platforms": [
    {
      "id": "google_ads",
      "name": "Google Ads",
      "connected": true,
      "accounts": [...]
    },
    {
      "id": "meta",
      "name": "Meta Ads",
      "connected": false
    }
  ]
}
```

---

#### `POST /api/onboarding/grow-summary/stream`
Stream grow summary during onboarding (SSE).

**Request Body:**
```json
{
  "session_id": "active_session_id",
  "platforms": ["google_ads"]
}
```

**Response:** SSE stream

**Notes:**
- Tailored for onboarding UX
- Shows first insights after platform connection

---

## 10. Internal APIs

> **Security:** All internal API endpoints require `X-API-Key` header authentication.
> Set `INTERNAL_API_KEY` environment variable to enable access.

#### `GET /api/internal/clients`
List all clients with connected platforms.

**Headers:**
| Name | Required | Description |
|------|----------|-------------|
| `X-API-Key` | Yes | Internal API key |

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `filter_type` | string | query | No | `new` (created recently) or `stale` (inactive) |
| `industry` | string | query | No | Filter by industry |
| `days` | integer | query | No | Days for filter (default: 30) |

**Response:**
```json
{
  "success": true,
  "total_clients": 25,
  "filters_applied": {
    "filter_type": "new",
    "industry": null,
    "days": 30
  },
  "clients": [
    {
      "user_id": "106540664695114193744",
      "email": "user@example.com",
      "name": "John Doe",
      "connected_platforms": ["google_ads", "meta_ads", "hubspot"],
      "accounts": [...],
      "total_sessions": 45,
      "last_active": "2026-01-28T10:00:00Z"
    }
  ]
}
```

---

#### `GET /api/internal/clients/ids`
List all client user IDs.

**Headers:**
| Name | Required | Description |
|------|----------|-------------|
| `X-API-Key` | Yes | Internal API key |

**Response:**
```json
{
  "success": true,
  "user_ids": ["user_id_1", "user_id_2", ...]
}
```

---

#### `GET /api/internal/clients/{user_id}/credentials`
Get credentials for a specific client.

**Headers:**
| Name | Required | Description |
|------|----------|-------------|
| `X-API-Key` | Yes | Internal API key |

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | path | Yes | Google user ID |
| `platforms` | string | query | No | Comma-separated platforms |

**Response:**
```json
{
  "success": true,
  "user_id": "106540664695114193744",
  "available_platforms": ["google_ads", "meta_ads", "hubspot"],
  "credentials": {
    "google_ads": {
      "access_token": "...",
      "refresh_token": "...",
      "client_id": "...",
      "client_secret": "..."
    },
    "meta_ads": {
      "access_token": "..."
    },
    "hubspot": {
      "access_token": "...",
      "portal_id": "45874928"
    }
  }
}
```

---

#### `GET /api/internal/clients/{user_id}/accounts`
Get accounts for a specific client.

**Headers:**
| Name | Required | Description |
|------|----------|-------------|
| `X-API-Key` | Yes | Internal API key |

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | path | Yes | User ID |

---

#### `GET /api/internal/health`
Health check for internal API.

**Headers:**
| Name | Required | Description |
|------|----------|-------------|
| `X-API-Key` | Yes | Internal API key |

**Response:**
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "total_users": 150,
    "total_accounts": 200
  },
  "credential_storage": {
    "healthy": true
  }
}
```

---

## 11. Status & Utility

#### `GET /health`
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-28T10:30:00Z"
}
```

---

#### `GET /`
Root health check (DigitalOcean App Platform).

**Response:**
```json
{
  "status": "ok",
  "service": "mia-backend"
}
```

---

#### `GET /api/auth/platforms`
Get which platforms user has connected.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | Yes | Active session ID |

**Response:**
```json
{
  "platforms": {
    "google_ads": true,
    "ga4": true,
    "meta_ads": true,
    "brevo": false,
    "hubspot": true,
    "mailchimp": false
  }
}
```

---

#### `GET /auth-test`
Simple auth test page for debugging authentication flow.

**Response:** HTML page

---

#### `GET /mia-chat-test`
Mobile test chat HTML page.

**Response:** HTML page

---

### Test Endpoints

#### `POST /api/test/s3-upload`
Test S3 upload functionality.

**Request Body:**
```json
{
  "client_id": "test_client",
  "data": "test data"
}
```

---

#### `GET /api/test/s3-verify`
Verify S3 upload.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `client_id` | string | query | Yes | Client ID |

---

#### `GET /api/test/dynamic/{account_id}`
Test dynamic account selection.

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `account_id` | string | path | Yes | Account ID |

---

## Endpoint Summary

| Category | Endpoint Count |
|----------|----------------|
| OAuth/Authentication | ~60 |
| Account & Session Management | ~5 |
| Tenant/Workspace Management | ~18 |
| Data APIs | ~18 |
| Insights & Analysis | ~40 |
| Platform Management | ~3 |
| Account Linking | ~10 |
| Chat | 1 |
| Onboarding | 7 |
| Internal APIs | 5 |
| Utilities/Status | ~8 |
| **Total** | **~175+** |

---

## Key Features

- **Multi-platform support:** Google Ads, Google Analytics 4, Meta/Facebook, Brevo, HubSpot, Mailchimp
- **Workspace/Tenant isolation:** Multi-user collaboration with role-based access (owner, admin, member)
- **Async task processing:** Background jobs with polling support
- **Streaming responses (SSE):** Real-time updates for long-running operations
- **Three-tier insights:**
  - **Bronze:** Instant facts (template-based, <1 second)
  - **Silver:** Claude-generated analysis (3-5 seconds)
  - **Gold:** Comprehensive multi-platform insights
- **Session-based authentication:** With tenant context support (Phase 2)
- **Rate limiting:** Implemented with slowapi (10-20 req/min for insights/chat)
- **Redis caching:** Platform data (30 min), Claude responses (2 hours)
- **Internal API:** Key-based authentication for service-to-service communication

---

## Authentication Notes

1. **Session-based:** Most endpoints require `session_id` parameter or `X-Session-ID` header
2. **Tenant context (Phase 2):** Many endpoints accept `tenant_id` for workspace credential isolation
3. **Internal API:** Uses `X-API-Key` header for service-to-service communication
4. **OAuth flows:** Google, Meta, HubSpot, Mailchimp use OAuth 2.0; Brevo uses API key

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "detail": "Error message describing the issue"
}
```

HTTP Status Codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid session or API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (dependency down)
