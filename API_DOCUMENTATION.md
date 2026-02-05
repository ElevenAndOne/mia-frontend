# MIA Backend API Endpoints Documentation

This document provides a comprehensive reference for all API endpoints available in the MIA Backend, including parameters, responses, and error handling.

**API Version:** 2.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Authentication & OAuth](#1-authentication--oauth)
5. [Account & Session Management](#2-account--session-management)
6. [Tenant/Workspace Management](#3-tenantworkspace-management)
7. [Data APIs](#4-data-apis)
8. [Insights & Analysis](#5-insights--analysis)
9. [Platform Management](#6-platform-management)
10. [Account Linking](#7-account-linking)
11. [Chat & Communication](#8-chat--communication)
12. [Onboarding](#9-onboarding)
13. [Internal APIs](#10-internal-apis)
14. [Status & Utility](#11-status--utility)

---

## Overview

The MIA Marketing Analytics API powers the MIA marketing analytics platform, providing:

- **Multi-Platform Data**: Google Ads, GA4, Meta Ads, HubSpot, Brevo, Mailchimp
- **AI-Powered Insights**: Grow, Optimize, and Protect analysis modes
- **Real-Time Streaming**: Server-sent events for live data updates
- **Multi-Tenant Workspaces**: Team collaboration with role-based access

---

## Authentication

All authenticated endpoints require the `X-Session-ID` header:

```
X-Session-ID: your-session-id-here
```

Sessions are created via OAuth login (Google, Meta, etc.) and expire after ~2 hours.

### Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Standard endpoints | 60 requests/minute |
| Insight generation | 10 requests/minute |
| Chat | 30 messages/minute |

---

## Error Handling

### Standard Error Response

All endpoints return consistent error responses:

```json
{
  "detail": "Error message describing the issue"
}
```

### Validation Error (422)

When request validation fails, endpoints return:

```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Schema: HTTPValidationError**
```json
{
  "detail": [
    {
      "loc": ["string", 0],
      "msg": "string",
      "type": "string"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `400` | Bad Request - Invalid parameters or missing required fields |
| `401` | Unauthorized - Invalid session or expired token |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `422` | Validation Error - Request body/params failed validation |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error - Server-side failure |
| `503` | Service Unavailable - Dependency down |

---

## 1. Authentication & OAuth

### Google OAuth

#### `GET /api/oauth/google/auth-url`
**Step 1 of User Flow: Initiate Google OAuth Login**

Generate a Google OAuth authorization URL for user authentication.

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | No | Existing session ID |
| `frontend_origin` | string | query | No | Frontend origin for callback |
| `tenant_id` | string | query | No | Workspace context for credential storage |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | OAuth URL generated successfully |
| `422` | Validation Error |
| `500` | Failed to generate OAuth URL |

**Response Example:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random_state_string",
  "tenant_id": "workspace_123"
}
```

---

#### `GET /api/oauth/google/status`
**Check if user is authenticated via Google OAuth**

Called on app load to determine if user has an active session.

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Returns authentication state and user info |

**Response (authenticated):**
```json
{
  "authenticated": true,
  "user_info": {
    "id": "google_user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://...",
    "has_seen_intro": false
  },
  "selected_account": {
    "id": "acc_123",
    "name": "My Business",
    "google_ads_id": "123-456-7890",
    "ga4_property_id": "properties/123456"
  }
}
```

**Response (not authenticated):**
```json
{
  "authenticated": false,
  "success": false,
  "error": "No active session"
}
```

---

#### `POST /api/oauth/google/complete`
**Complete the OAuth flow after Google redirect**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | Google user ID from OAuth callback |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Session created, user authenticated |
| `400` | Session ID required |
| `422` | Validation Error |
| `500` | OAuth completion failed |

**Response:**
```json
{
  "success": true,
  "session_id": "sess_abc123",
  "user": {
    "id": "google_user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "is_new_user": true
}
```

---

#### `POST /api/oauth/google/login`
**Login - restore session from existing credentials**

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `POST /api/oauth/google/logout`
**Logout - marks session as logged out but keeps credentials**

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `GET /api/oauth/google/callback`
**Handle OAuth callback from Google**

**Tags:** Google OAuth

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response (HTML page that auto-closes or redirects) |

---

#### `POST /api/oauth/google/exchange-token`
**Exchange authorization code for access token**

**Tags:** Google OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | query | No | Workspace context |

**Request Body:** `application/json`
```json
{
  "code": "authorization_code_from_google"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/google/user-info`
**Get current user info**

**Tags:** Google OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | User ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/google/ad-accounts`
**Fetch user's Google Ads accounts**

Separates MCC accounts from regular accounts.

**Tags:** Google OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | **Yes** | User ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

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
**Get Meta OAuth authentication URL**

**Tags:** Meta OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | query | No | Workspace context |
| `X-Session-ID` | string | header | No | Session ID (required if tenant_id provided) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `401` | Session invalid/expired (workspace OAuth only) |
| `403` | User not admin/owner of workspace |
| `422` | Validation Error |
| `500` | OAuth URL generation failed |

**Response:**
```json
{
  "auth_url": "https://www.facebook.com/v18.0/dialog/oauth?...",
  "state": "encrypted_state_token"
}
```

---

#### `POST /meta-oauth/exchange-token`
**Exchange authorization code for access token**

**Tags:** Meta OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | query | No | Workspace context |

**Request Body:** `application/json`
```json
{
  "code": "authorization_code_from_meta"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `400` | Token exchange failed |
| `422` | Validation Error |

---

#### `GET /meta-oauth/callback`
**Handle OAuth callback from Meta**

**Tags:** Meta OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `code` | string | query | **Yes** | Authorization code |
| `state` | string | query | No | State parameter |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /meta-oauth/user-info`
**Get current Meta user info**

**Tags:** Meta OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | User ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /meta-oauth/ad-accounts`
**Fetch user's Meta ad accounts**

**Tags:** Meta OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | User ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /meta-oauth/status`
**Get Meta authentication status**

**Tags:** Meta OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | User ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /meta-oauth/complete`
**Complete OAuth flow**

**Tags:** Meta OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | No | User ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /meta-oauth/logout`
**Logout user and revoke Meta tokens**

**Tags:** Meta OAuth

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

### Meta OAuth Enhanced (Session-Based)

#### `GET /api/oauth/meta/auth-url`
**Get Meta OAuth authentication URL - Enhanced version**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | query | No | Workspace context |
| `frontend_origin` | string | query | No | Frontend origin for callback |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/meta/callback`
**Handle OAuth callback with redirect**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `code` | string | query | **Yes** | Authorization code |
| `state` | string | query | No | State parameter |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/oauth/meta/exchange-token`
**Exchange Meta authorization code for access token via MCP server**

**Tags:** Authentication

**Request Body:** `application/json`
```json
{
  "code": "authorization_code_from_meta",
  "state": "optional_state"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/meta/status`
**Get Meta authentication status**

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `GET /api/oauth/meta/user-info`
**Get Meta user info - Enhanced version**

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `POST /api/oauth/meta/complete`
**Complete Meta OAuth flow**

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `GET /api/oauth/meta/accounts/available`
**Get available Meta ad accounts for linking**

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

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
**Link a Meta ad account to the current account mapping**

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `POST /api/oauth/meta/logout`
**Logout from Meta**

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `GET /api/oauth/meta/credentials-status`
**Check if Meta credentials exist in database**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/meta/organic/facebook-pages`
**Get Facebook pages for organic posting**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `refresh` | boolean | query | No | Force refresh from API (default: false) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/oauth/meta/organic/link-page`
**Link a Facebook page for organic content insights**

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

### Brevo OAuth

#### `POST /api/oauth/brevo/save-api-key`
**Save Brevo API key for email marketing integration**

**Tags:** Authentication

**Request Body:** `application/json`
```json
{
  "session_id": "active_session_id",
  "api_key": "xkeysib-xxxxx...",
  "account_id": "local_account_id"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/brevo/status`
**Check Brevo connection status**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `DELETE /api/oauth/brevo/disconnect`
**Disconnect Brevo integration**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |
| `brevo_id` | integer | query | No | Specific Brevo account ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/brevo/accounts`
**Get all Brevo accounts for current account**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/oauth/brevo/select-account`
**Select a Brevo account as primary**

**Tags:** Authentication

**Request Body:** `application/json`
```json
{
  "session_id": "active_session_id",
  "brevo_account_id": 1,
  "account_id": "local_account_id"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Brevo Session Management

#### `POST /api/brevo/connect`
**Connect Brevo with API key**

**Tags:** Brevo Session

**Request Body:** `application/json`
```json
{
  "session_id": "active_session_id",
  "api_key": "xkeysib-xxxxx..."
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/brevo/disconnect`
**Disconnect Brevo**

**Tags:** Brevo Session

**Request Body:** `application/json`
```json
{
  "session_id": "active_session_id"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/brevo/status`
**Get Brevo connection status**

**Tags:** Brevo Session

**Request Body:** `application/json`
```json
{
  "session_id": "active_session_id"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### HubSpot OAuth

#### `GET /api/oauth/hubspot/auth-url`
**Get HubSpot OAuth authentication URL**

**Tags:** HubSpot OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |
| `tenant_id` | string | query | **Yes** | Workspace context |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/hubspot/callback`
**Handle OAuth callback**

**Tags:** HubSpot OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `code` | string | query | **Yes** | Authorization code |
| `state` | string | query | **Yes** | State parameter |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/hubspot/user-info`
**Check if user has HubSpot connected**

**Tags:** HubSpot OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | **Yes** | User ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/oauth/hubspot/disconnect`
**Disconnect HubSpot**

**Tags:** HubSpot OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | **Yes** | User ID |
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `DELETE /api/oauth/hubspot/disconnect`
**Disconnect HubSpot integration**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID |
| `hubspot_id` | integer | query | No | Specific HubSpot account ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/oauth/hubspot/link-portal`
**Link HubSpot portal (multi-account support)**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |

**Request Body:** `application/json`
```json
{
  "access_token": "hubspot_oauth_token",
  "refresh_token": "hubspot_refresh_token",
  "portal_id": "45874928",
  "account_id": "local_account_id"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/hubspot/accounts`
**Get linked HubSpot accounts**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/oauth/hubspot/select-account`
**Select HubSpot account as primary**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `hubspot_id` | integer | query | **Yes** | HubSpot account ID |
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/hubspot/status`
**Get HubSpot connection status**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Mailchimp OAuth

#### `GET /api/oauth/mailchimp/auth-url`
**Get Mailchimp OAuth authentication URL**

**Tags:** Mailchimp OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | query | **Yes** | Workspace context |
| `X-Session-ID` | string | header | **Yes** | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/mailchimp/callback`
**Handle OAuth callback**

**Tags:** Mailchimp OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `code` | string | query | **Yes** | Authorization code |
| `state` | string | query | **Yes** | State parameter |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/mailchimp/user-info`
**Check if user has Mailchimp connected**

**Tags:** Mailchimp OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | **Yes** | User ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/oauth/mailchimp/disconnect`
**Disconnect Mailchimp account**

**Tags:** Mailchimp OAuth

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | **Yes** | User ID |
| `session_id` | string | query | **Yes** | Session ID |
| `mailchimp_account_id` | string | query | No | Specific account ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `DELETE /api/oauth/mailchimp/disconnect`
**Disconnect Mailchimp integration**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID |
| `mailchimp_id` | integer | query | No | Specific account ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/mailchimp/status`
**Check Mailchimp connection status**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/oauth/mailchimp/accounts`
**Get all Mailchimp accounts**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/oauth/mailchimp/set-primary`
**Set primary Mailchimp account**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `mailchimp_id` | integer | query | **Yes** | Mailchimp account ID |
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `DELETE /api/oauth/mailchimp/accounts/{mailchimp_id}`
**Delete specific Mailchimp account**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `mailchimp_id` | integer | path | **Yes** | Mailchimp account ID |
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## 2. Account & Session Management

### Session Management

#### `GET /api/session/validate`
**Validate session and return session details**

**Tags:** Session

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID to validate |
| `sync_accounts` | boolean | query | No | Run account sync during validation (default: false) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

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

---

#### `POST /api/session/select-mcc`
**Store the selected MCC ID for a session**

**Tags:** Session

**Request Body:** `application/json`
```json
{
  "session_id": "active_session_id",
  "mcc_id": "7299783943"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/accounts/sync`
**Sync user accounts**

Validates DB entries against actual API data.

**Tags:** Session

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/accounts/sync-status`
**Get current account status for debugging**

**Tags:** Session

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/admin/cleanup-orphan-accounts`
**ADMIN ONLY: One-time cleanup of orphan Meta accounts**

**Tags:** Session

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `admin_key` | string | query | **Yes** | Admin API key (INTERNAL_API_KEY) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## 3. Tenant/Workspace Management

### Workspace CRUD

#### `POST /api/tenants`
**Create new workspace/tenant**

**Tags:** tenants

**Request Body:** `application/json`
```json
{
  "name": "My Agency Workspace"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/tenants`
**List all workspaces for authenticated user**

**Tags:** tenants

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `POST /api/tenants/switch`
**Switch to different workspace**

**Tags:** tenants

**Request Body:** `application/json`
```json
{
  "tenant_id": "target_tenant_id"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/tenants/current`
**Get current active workspace**

**Tags:** tenants

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `GET /api/tenants/{tenant_id}`
**Get workspace details**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | path | **Yes** | Workspace ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `PUT /api/tenants/{tenant_id}`
**Update workspace**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | path | **Yes** | Workspace ID |

**Request Body:** `application/json`
```json
{
  "name": "Updated Workspace Name"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `DELETE /api/tenants/{tenant_id}`
**Delete workspace**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | path | **Yes** | Workspace ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Workspace Members

#### `GET /api/tenants/{tenant_id}/members`
**List workspace members**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | path | **Yes** | Workspace ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `DELETE /api/tenants/{tenant_id}/members/{user_id}`
**Remove member from workspace**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | path | **Yes** | Workspace ID |
| `user_id` | string | path | **Yes** | User ID to remove |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `PUT /api/tenants/{tenant_id}/members/{user_id}/role`
**Update member role**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | path | **Yes** | Workspace ID |
| `user_id` | string | path | **Yes** | User ID |

**Request Body:** `application/json`
```json
{
  "role": "admin"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Workspace Invites

#### `POST /api/tenants/{tenant_id}/invites`
**Create workspace invite**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | path | **Yes** | Workspace ID |

**Request Body:** `application/json`
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/tenants/{tenant_id}/invites`
**List workspace invites**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | path | **Yes** | Workspace ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `DELETE /api/tenants/{tenant_id}/invites/{invite_id}`
**Revoke workspace invite**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | path | **Yes** | Workspace ID |
| `invite_id` | string | path | **Yes** | Invite ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/tenants/invites/{invite_id}/details`
**Get invite details (public)**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `invite_id` | string | path | **Yes** | Invite ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/tenants/invites/{invite_id}/accept`
**Accept workspace invite**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `invite_id` | string | path | **Yes** | Invite ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/tenants/invites/pending`
**Get pending invites for current user**

**Tags:** tenants

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `GET /api/tenants/{tenant_id}/integrations`
**Get workspace platform integrations**

**Tags:** tenants

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `tenant_id` | string | path | **Yes** | Workspace ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## 4. Data APIs

### Google Ads API

#### `GET /advertising/accounts`
**Get all accessible Google Ads accounts**

**Tags:** Google Ads API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context (Phase 2) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

**Response Schema: CustomerAccount[]**
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

---

#### `GET /advertising/accounts/{customer_id}/campaigns`
**Get campaigns for a specific customer account**

**Tags:** Google Ads API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `customer_id` | string | path | **Yes** | Google Ads customer ID |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `include_metrics` | boolean | query | No | Include campaign metrics (default: true) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

**Response Schema: Campaign[]**
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
      "conversions": 45.0
    }
  }
]
```

---

#### `GET /advertising/accounts/{customer_id}/performance`
**Get account performance metrics for a date range**

**Tags:** Google Ads API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `customer_id` | string | path | **Yes** | Google Ads customer ID |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | **Yes** | Start date (YYYY-MM-DD) |
| `end_date` | string | query | **Yes** | End date (YYYY-MM-DD) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /advertising/health`
**Check if Google Ads API integration is properly configured**

**Tags:** Google Ads API

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

### Meta Ads API

#### `GET /meta-ads/accounts`
**Get all accessible Meta ad accounts**

**Tags:** Meta Ads API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /meta-ads/accounts/{account_id}/campaigns`
**Get campaigns for a specific Meta ad account**

**Tags:** Meta Ads API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `account_id` | string | path | **Yes** | Meta ad account ID (with act_ prefix) |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `include_metrics` | boolean | query | No | Include campaign metrics (default: true) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /meta-ads/accounts/{account_id}/performance`
**Get Meta account performance metrics**

**Tags:** Meta Ads API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `account_id` | string | path | **Yes** | Meta ad account ID |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | **Yes** | Start date (YYYY-MM-DD) |
| `end_date` | string | query | **Yes** | End date (YYYY-MM-DD) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /meta-ads/accounts/{account_id}/adsets`
**Get ad sets for a Meta ad account**

**Tags:** Meta Ads API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `account_id` | string | path | **Yes** | Meta ad account ID |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `campaign_id` | string | query | No | Filter by campaign ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /meta-ads/accounts/{account_id}/ads`
**Get ads for a Meta ad account**

**Tags:** Meta Ads API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `account_id` | string | path | **Yes** | Meta ad account ID |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `adset_id` | string | query | No | Filter by ad set ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Google Analytics API

#### `GET /analytics/properties`
**List GA4 properties accessible to the user**

**Tags:** Google Analytics API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /analytics/properties/{property_id}/metrics`
**Get GA4 metrics for a property**

**Tags:** Google Analytics API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `property_id` | string | path | **Yes** | GA4 property ID |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | **Yes** | Start date (YYYY-MM-DD) |
| `end_date` | string | query | **Yes** | End date (YYYY-MM-DD) |
| `dimensions` | any | query | No | Optional dimensions |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /analytics/properties/{property_id}/top-pages`
**Get top pages for a GA4 property**

**Tags:** Google Analytics API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `property_id` | string | path | **Yes** | GA4 property ID |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | **Yes** | Start date |
| `end_date` | string | query | **Yes** | End date |
| `limit` | integer | query | No | Number of results (default: 10) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /analytics/properties/{property_id}/traffic-sources`
**Get traffic sources for a GA4 property**

**Tags:** Google Analytics API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `property_id` | string | path | **Yes** | GA4 property ID |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | **Yes** | Start date |
| `end_date` | string | query | **Yes** | End date |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /analytics/properties/{property_id}/conversions`
**Get conversions for a GA4 property**

**Tags:** Google Analytics API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `property_id` | string | path | **Yes** | GA4 property ID |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |
| `start_date` | string | query | **Yes** | Start date |
| `end_date` | string | query | **Yes** | End date |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /analytics/properties/{property_id}/realtime`
**Get real-time GA4 data**

**Tags:** Google Analytics API

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `property_id` | string | path | **Yes** | GA4 property ID |
| `user_id` | string | query | **Yes** | User ID for credentials |
| `tenant_id` | string | query | No | Workspace context |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## 5. Insights & Analysis

### Quick Insights (Silver Tier)

#### `POST /api/quick-insights/grow`
**Generate Grow insights (growth opportunities)**

**Request Body:** `application/json`
```json
{
  "session_id": "active_session_id",
  "user_id": "optional_user_id",
  "date_range": "30_days",
  "platforms": ["google_ads", "meta", "ga4"]
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/quick-insights/grow/stream`
**Stream Grow insights with SSE**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/quick-insights/optimize`
**Generate Optimize insights**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/quick-insights/optimize/stream`
**Stream Optimize insights with SSE**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/quick-insights/protect`
**Generate Protect insights (risk identification)**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/quick-insights/protect/stream`
**Stream Protect insights with SSE**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/quick-insights/summary`
**Generate Summary insights (executive overview)**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Intelligence Snapshot

#### `POST /api/snapshot/generate`
**Generate intelligence snapshot**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/snapshot/stream`
**Stream intelligence snapshot generation with SSE**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Bronze Insights (Bronze Tier)

#### `POST /api/bronze/highlight`
**Get instant bronze facts**

Template-based, <1 second response.

**Tags:** bronze

**Request Body:** `application/json`
```json
{
  "session_id": "active_session_id",
  "highlight_type": "grow",
  "date_range": "30_days"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Instant fact returned (<1 second) |
| `400` | No connected platforms found |
| `401` | Session not found or expired |
| `404` | No account selected |
| `422` | Validation Error |

---

#### `POST /api/bronze/followup`
**Follow up on bronze fact with AI analysis**

**Tags:** bronze

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/bronze/prefetch-status`
**Get prefetch status for bronze data**

**Tags:** bronze

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Async Insights

#### `POST /api/insights/grow/async`
**Start Grow insights generation in background**

**Tags:** insights-async

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/insights/optimize/async`
**Start Optimize insights generation in background**

**Tags:** insights-async

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/insights/protect/async`
**Start Protect insights generation in background**

**Tags:** insights-async

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/insights/task/{task_id}`
**Poll for async task status**

**Tags:** insights-async

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `task_id` | string | path | **Yes** | Task ID from async request |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `DELETE /api/insights/task/{task_id}`
**Cancel a running task**

**Tags:** insights-async

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `task_id` | string | path | **Yes** | Task ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Website Analytics

#### `POST /user-journey-analysis`
**Analyze user journey from ads to conversions**

**Request Body:** `application/x-www-form-urlencoded`

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /drop-off-analysis`
**Identify user drop-off points**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /conversion-funnel-optimization`
**Generate funnel optimization recommendations**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /traffic-quality-analysis`
**Analyze traffic quality across sources**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Ad Insights

#### `POST /ad-performance-analysis`
**Comprehensive ad performance analysis**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /ad-performance`
**Comprehensive ad performance analysis (clean version)**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /campaign-comparison`
**Compare performance across campaigns**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /ad-recommendations`
**Generate actionable ad optimization recommendations**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /performance-trends`
**Analyze performance trends over time**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /optimization-action-plan`
**Generate detailed optimization action plan**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /budget-reallocation-plan`
**Generate budget reallocation recommendations**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /file-insights`
**Analyze uploaded CSV files for insights**

**Request:** Multipart form data

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

### Other Insights

#### `POST /comprehensive-insights`
**OAuth-only comprehensive insights endpoint**

**Request Body:** `application/json`
```json
{
  "user_id": "user_id",
  "start_date": "2026-01-01",
  "end_date": "2026-01-28",
  "data_selections": [...],
  "analysis_options": {...}
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /eda`
**Run exploratory data analysis on uploaded CSV**

**Request:** Multipart form data

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /ga4-data-availability`
**Check what GA4 data is available**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /complete-website-insights`
**Generate comprehensive GA4 insights**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /debug-ad-data-availability`
**Debug endpoint to check ad data availability**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /clean-insights`
**Upload CSV files and get consolidated insights**

**Request:** Multipart form data

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /clean-insights/example`
**Get usage examples for the clean insights endpoint**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `POST /journey-analysis`
**Analyze user journey (clean version)**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /funnel-optimization`
**Generate funnel optimization recommendations (clean version)**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## 6. Platform Management

#### `POST /api/platform/{platform}/disconnect`
**Disconnect a platform from the account**

**Tags:** platform-management

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `platform` | string | path | **Yes** | Platform name: `google`, `meta`, `brevo`, `hubspot`, `mailchimp` |
| `X-Session-ID` | string | header | No | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/platform/{platform}/refresh`
**Refresh platform connection/data**

**Tags:** platform-management

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `platform` | string | path | **Yes** | Platform name |
| `X-Session-ID` | string | header | No | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/platform/{platform}/status`
**Get platform connection status**

**Tags:** platform-management

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `platform` | string | path | **Yes** | Platform name |
| `X-Session-ID` | string | header | No | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## 7. Account Linking

#### `GET /api/accounts/available`
**Get available accounts for linking**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `refresh` | boolean | query | No | Force refresh GA4 properties (default: false) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/accounts/select`
**Select account for use**

**Tags:** Authentication

**Request Body:** `application/json`
```json
{
  "account_id": "account_uuid",
  "session_id": "optional_session_id"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/accounts/link-platform`
**Manually link a platform to an account**

**Tags:** Authentication

**Request Body:** `application/json`
```json
{
  "account_id": "account_uuid",
  "platform": "meta",
  "platform_id": "act_123456789"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/accounts/link-google`
**Link Google account to local account**

**Tags:** Authentication

**Request Body:** `application/json`
```json
{
  "google_ads_customer_id": "7574136388",
  "login_customer_id": "optional_mcc_id",
  "target_account_id": "account_uuid"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/google/accounts/link`
**Link Google Ads account**

**Tags:** Authentication

**Request Body:** `application/json`
```json
{
  "google_ads_customer_id": "7574136388",
  "target_account_id": "account_uuid"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/google/accounts/discovered`
**Get discovered Google accounts from API**

**Tags:** Authentication

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `POST /api/ga4/refresh`
**Refresh GA4 properties for the account**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `X-Session-ID` | string | header | No | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/account/platform-preferences`
**Get saved platform preferences**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `PUT /api/account/platform-preferences`
**Save platform preferences**

**Tags:** Authentication

**Request Body:** `application/json`
```json
{
  "session_id": "active_session_id",
  "selected_platforms": ["google_ads", "meta", "ga4"]
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## 8. Chat & Communication

#### `POST /api/chat`
**Send chat message with AI analysis**

**Tags:** Chat

**Request Body:** `application/json`
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

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## 9. Onboarding

#### `GET /api/onboarding/status`
**Get current onboarding state**

**Tags:** onboarding

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Current onboarding state |
| `401` | Session not found or expired |
| `422` | Validation Error |

---

#### `POST /api/onboarding/update-step`
**Update onboarding step status**

**Tags:** onboarding

**Request Body:** `application/json`
```json
{
  "session_id": "active_session_id",
  "step": 2
}
```

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Step updated successfully |
| `400` | Invalid step value (must be 0-5) |
| `401` | Session not found |
| `422` | Validation Error |

---

#### `POST /api/onboarding/advance`
**Advance to next onboarding step**

**Tags:** onboarding

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Advanced to next step |
| `401` | Session not found |
| `422` | Validation Error |

---

#### `POST /api/onboarding/complete`
**Mark onboarding as complete**

**Tags:** onboarding

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/onboarding/skip`
**Skip onboarding process**

**Tags:** onboarding

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/onboarding/available-platforms`
**Get available platforms for onboarding**

**Tags:** onboarding

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `POST /api/onboarding/grow-summary/stream`
**Stream grow summary during onboarding (SSE)**

**Tags:** onboarding

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## 10. Internal APIs

> **Security:** All internal API endpoints require `X-API-Key` header authentication.

#### `GET /api/internal/clients`
**List all clients with connected platforms**

**Tags:** Internal Data API

**Headers:**
| Name | Required | Description |
|------|----------|-------------|
| `x-api-key` | **Yes** | Internal API key |

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `filter_type` | any | query | No | `new` or `stale` |
| `industry` | any | query | No | Filter by industry |
| `days` | any | query | No | Days for filter (default: 30) |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/internal/clients/ids`
**List all client user IDs**

**Tags:** Internal Data API

**Headers:**
| Name | Required | Description |
|------|----------|-------------|
| `x-api-key` | **Yes** | Internal API key |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/internal/clients/{user_id}/credentials`
**Get credentials for a specific client**

**Tags:** Internal Data API

**Headers:**
| Name | Required | Description |
|------|----------|-------------|
| `x-api-key` | **Yes** | Internal API key |

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | path | **Yes** | Google user ID |
| `platforms` | any | query | No | Comma-separated platforms |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/internal/clients/{user_id}/accounts`
**Get accounts for a specific client**

**Tags:** Internal Data API

**Headers:**
| Name | Required | Description |
|------|----------|-------------|
| `x-api-key` | **Yes** | Internal API key |

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `user_id` | string | path | **Yes** | User ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/internal/health`
**Health check for internal API**

**Tags:** Internal Data API

**Headers:**
| Name | Required | Description |
|------|----------|-------------|
| `x-api-key` | **Yes** | Internal API key |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## 11. Status & Utility

#### `GET /health`
**Basic health check endpoint**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `GET /health/detailed`
**Detailed health check**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /`
**Root health check (DigitalOcean App Platform)**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |

---

#### `GET /api/auth/platforms`
**Get which platforms user has connected**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `session_id` | string | query | **Yes** | Active session ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /auth-test`
**Simple auth test page for debugging**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | HTML page |

---

#### `GET /mia-chat-test`
**Mobile test chat HTML page**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | HTML page |

---

### Test Endpoints

#### `POST /api/test/s3-upload`
**Test S3 upload functionality**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/test/s3-verify`
**Verify S3 upload**

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

#### `GET /api/test/dynamic/{account_id}`
**Test dynamic account selection**

**Tags:** Authentication

**Parameters:**
| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `account_id` | string | path | **Yes** | Account ID |

**Responses:**
| Code | Description |
|------|-------------|
| `200` | Successful Response |
| `422` | Validation Error |

---

## Endpoint Summary

| Category | Endpoint Count |
|----------|----------------|
| Authentication & OAuth | ~65 |
| Account & Session Management | ~5 |
| Tenant/Workspace Management | ~18 |
| Data APIs (Google Ads, Meta, GA4) | ~18 |
| Insights & Analysis | ~35 |
| Platform Management | ~3 |
| Account Linking | ~10 |
| Chat | 1 |
| Onboarding | 7 |
| Internal APIs | 5 |
| Utilities/Status | ~10 |
| **Total** | **~157** |

---

## Key Request/Response Schemas

### CustomerAccount
```json
{
  "id": "string (required)",
  "name": "string (required)",
  "currency_code": "string (required)",
  "time_zone": "string (required)",
  "resource_name": "string (required)"
}
```

### Campaign
```json
{
  "id": "string (required)",
  "name": "string (required)",
  "status": "string (required)",
  "resource_name": "string (required)",
  "metrics": "CampaignMetrics | null"
}
```

### AccountSelectionRequest
```json
{
  "account_id": "string (required)",
  "session_id": "string | null (default: test_session)"
}
```

### PlatformLinkRequest
```json
{
  "account_id": "string (required)",
  "platform": "string (required)",
  "platform_id": "string (required)"
}
```

### GoogleLinkRequest
```json
{
  "google_ads_customer_id": "string (required)",
  "login_customer_id": "string | null",
  "target_account_id": "string (required)"
}
```

### PlatformPreferencesRequest
```json
{
  "session_id": "string (required)",
  "selected_platforms": ["string"] (required)
}
```

### MetaTokenExchangeRequest
```json
{
  "code": "string (required)",
  "state": "string | null"
}
```

### HTTPValidationError
```json
{
  "detail": [
    {
      "loc": ["string", 0],
      "msg": "string",
      "type": "string"
    }
  ]
}
```

---

## Authentication Notes

1. **Session-based:** Most endpoints require `session_id` parameter or `X-Session-ID` header
2. **Tenant context (Phase 2):** Many endpoints accept `tenant_id` for workspace credential isolation
3. **Internal API:** Uses `X-API-Key` header for service-to-service communication
4. **OAuth flows:** Google, Meta, HubSpot, Mailchimp use OAuth 2.0; Brevo uses API key

---

## Response Formats

- **JSON:** Most endpoints return JSON
- **SSE:** Streaming endpoints (`/stream`) return Server-Sent Events
- **HTML:** Auth test pages return HTML

---

*Generated from OpenAPI spec version 2.0.0*
