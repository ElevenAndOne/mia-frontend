# MIA Frontend API Documentation

## Overview
This document provides a comprehensive overview of all API endpoints used in the MIA Frontend application. The application uses a React frontend with TypeScript and communicates with a backend API server.

## API Configuration

### Base URL Configuration
- **Environment Variable**: `VITE_API_BASE_URL`
- **Default Local URL**: `http://localhost:8000`
- **Production URL**: `https://dolphin-app-b869e.ondigitalocean.app` (when deployed on DigitalOcean)
- **Configuration File**: `/src/utils/api.ts`

### API Utility Functions
```typescript
// Main API fetch wrapper
apiFetch(path: string, options?: RequestInit): Promise<Response>

// Create full API URL
createApiUrl(path: string): string
```

## Authentication & Session Management

### Google OAuth

#### 1. Get Google Auth URL
- **Endpoint**: `GET /api/oauth/google/auth-url`
- **Headers**: 
  - `X-Session-ID` (optional)
- **Response**: `{ auth_url: string }`
- **Used in**: 
  - `/src/contexts/SessionContext.tsx`
  - `/src/services/auth.ts`
  - `/src/components/IntegrationsPage.tsx`

#### 2. Check Google Auth Status
- **Endpoint**: `GET /api/oauth/google/status`
- **Headers**: 
  - `X-Session-ID`
- **Response**: 
  ```json
  {
    "authenticated": boolean,
    "user_info": {
      "email": string,
      "name": string,
      "picture": string,
      "id": string
    },
    "selected_account": {...}
  }
  ```
- **Used in**: 
  - `/src/contexts/SessionContext.tsx`
  - `/src/services/auth.ts`

#### 3. Complete Google OAuth
- **Endpoint**: `POST /api/oauth/google/complete`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Body**: `{ session_id: string }`
- **Used in**: 
  - `/src/contexts/SessionContext.tsx`
  - `/src/components/IntegrationsPage.tsx`

#### 4. Google Logout
- **Endpoint**: `POST /api/oauth/google/logout`
- **Headers**: 
  - `X-Session-ID`
- **Used in**: 
  - `/src/contexts/SessionContext.tsx`
  - `/src/services/auth.ts`

#### 5. Force Google Logout
- **Endpoint**: `POST /api/oauth/google/force-logout`
- **Headers**: 
  - `X-Session-ID`
- **Used in**: `/src/services/auth.ts`

### Meta OAuth

#### 1. Get Meta Auth URL
- **Endpoint**: `GET /api/oauth/meta/auth-url`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Response**: `{ auth_url: string }`
- **Used in**: 
  - `/src/services/metaAuth.ts`
  - `/src/contexts/SessionContext.tsx`
  - `/src/components/IntegrationsPage.tsx`

#### 2. Exchange Meta Code for Tokens
- **Endpoint**: `POST /api/oauth/meta/exchange-token`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Body**: `{ code: string }`
- **Used in**: `/src/services/metaAuth.ts`

#### 3. Get Meta User Info
- **Endpoint**: `GET /api/oauth/meta/user-info`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Response**: 
  ```json
  {
    "authenticated": boolean,
    "user_info": {
      "id": string,
      "name": string,
      "email": string
    }
  }
  ```
- **Used in**: `/src/services/metaAuth.ts`

#### 4. Check Meta Auth Status
- **Endpoint**: `GET /api/oauth/meta/status`
- **Headers**: 
  - `X-Session-ID`
- **Used in**: `/src/contexts/SessionContext.tsx`

#### 5. Complete Meta OAuth
- **Endpoint**: `POST /api/oauth/meta/complete`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Body**: `{ session_id: string }`
- **Used in**: 
  - `/src/contexts/SessionContext.tsx`
  - `/src/components/IntegrationsPage.tsx`

#### 6. Meta Logout
- **Endpoint**: `POST /api/oauth/meta/logout`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Used in**: 
  - `/src/services/metaAuth.ts`
  - `/src/contexts/SessionContext.tsx`
  - `/src/utils/clearMetaAuth.ts`

### Session Management

#### 1. Validate Session
- **Endpoint**: `GET /api/session/validate`
- **Query Params**: `session_id`
- **Response**: 
  ```json
  {
    "valid": boolean,
    "platforms": {
      "google": boolean,
      "meta": boolean
    },
    "user": {
      "name": string,
      "email": string,
      "picture_url": string,
      "user_id": string
    },
    "selected_account": {...}
  }
  ```
- **Used in**: 
  - `/src/contexts/SessionContext.tsx`
  - `/src/components/MCCSelectionPage.tsx`

## Account Management

#### 1. Get Available Accounts
- **Endpoint**: `GET /api/accounts/available`
- **Headers**: 
  - `X-Session-ID`
- **Response**: 
  ```json
  {
    "accounts": [{
      "id": string,
      "name": string,
      "google_ads_id": string,
      "ga4_property_id": string,
      "meta_ads_id": string,
      "business_type": string,
      "linked_ga4_properties": array
    }],
    "ga4_properties": array
  }
  ```
- **Used in**: 
  - `/src/contexts/SessionContext.tsx`
  - `/src/components/IntegrationsPage.tsx`

#### 2. Select Account
- **Endpoint**: `POST /api/accounts/select`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Body**: 
  ```json
  {
    "account_id": string,
    "session_id": string
  }
  ```
- **Used in**: `/src/contexts/SessionContext.tsx`

## Meta Ads Integration

#### 1. Get Meta Ad Accounts
- **Endpoint**: `GET /api/oauth/meta/accounts`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Used in**: `/src/services/metaAds.ts`

#### 2. Get Available Meta Accounts
- **Endpoint**: `GET /api/oauth/meta/api/accounts/available`
- **Headers**: 
  - `X-Session-ID`
- **Used in**: `/src/components/MetaAccountSelector.tsx`

#### 3. Link Meta Account
- **Endpoint**: `POST /api/oauth/meta/api/accounts/link`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Body**: `{ meta_account_id: string }`
- **Used in**: `/src/components/MetaAccountSelector.tsx`

#### 4. Get Meta Campaigns
- **Endpoint**: `GET /api/oauth/meta/accounts/{accountId}/campaigns`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Query Params**: `include_metrics` (optional)
- **Used in**: `/src/services/metaAds.ts`

#### 5. Get Meta Account Performance
- **Endpoint**: `GET /api/oauth/meta/accounts/{accountId}/performance`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Query Params**: 
  - `start_date`
  - `end_date`
- **Used in**: `/src/services/metaAds.ts`

#### 6. Get Meta Ad Sets
- **Endpoint**: `GET /api/oauth/meta/accounts/{accountId}/adsets`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Query Params**: `campaign_id` (optional)
- **Used in**: `/src/services/metaAds.ts`

#### 7. Get Meta Ads
- **Endpoint**: `GET /api/oauth/meta/accounts/{accountId}/ads`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Query Params**: `adset_id` (optional)
- **Used in**: `/src/services/metaAds.ts`

## Google Ads Integration

#### 1. Get Google Ad Accounts
- **Endpoint**: `GET /api/oauth/google/ad-accounts`
- **Query Params**: `user_id`
- **Used in**: `/src/components/MCCSelectionPage.tsx`

## MCP (Model Context Protocol) Integration

#### 1. Get Google Ads Accounts via MCP
- **Endpoint**: `POST /api/mcp/google-ads-accounts`
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: `{ tool: "get_google_ads_accounts" }`
- **Used in**: `/src/services/accountService.ts`

#### 2. Get GA4 Properties via MCP
- **Endpoint**: `POST /api/mcp/ga4-properties`
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: `{ tool: "get_ga4_properties" }`
- **Used in**: `/src/services/accountService.ts`

## Analytics & Insights

#### 1. Chat API
- **Endpoint**: `POST /api/chat`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Session-ID`
- **Body**: 
  ```json
  {
    "message": string,
    "session_id": string,
    "user_id": string,
    "google_ads_id": string,
    "ga4_property_id": string,
    "date_range": string
  }
  ```
- **Used in**: `/src/components/MainViewCopy.tsx`

#### 2. Growth Data
- **Endpoint**: `POST /api/growth-data`
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "question": string,
    "context": "growth",
    "user": string,
    "selected_account": object,
    "user_id": string
  }
  ```
- **Used in**: `/src/components/MainViewCopy.tsx`

#### 3. Improve Data
- **Endpoint**: `POST /api/improve-data`
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: Same as Growth Data but with `context: "improve"`
- **Used in**: `/src/components/MainViewCopy.tsx`

#### 4. Fix Data
- **Endpoint**: `POST /api/fix-data`
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: Same as Growth Data but with `context: "fix"`
- **Used in**: `/src/components/MainViewCopy.tsx`

#### 5. Quick Insights - Grow
- **Endpoint**: `POST /api/quick-insights/grow`
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "session_id": string,
    "date_range": string
  }
  ```
- **Used in**: `/src/components/GrowInsights.tsx`

#### 6. Quick Insights - Optimize
- **Endpoint**: `POST /api/quick-insights/optimize`
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: Same as Grow insights
- **Used in**: `/src/components/OptimizeInsights.tsx`

#### 7. Quick Insights - Protect
- **Endpoint**: `POST /api/quick-insights/protect`
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: Same as Grow insights
- **Used in**: `/src/components/ProtectInsights.tsx`

#### 8. Quick Insights - Summary
- **Endpoint**: `POST /api/quick-insights/summary`
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: Same as Grow insights
- **Used in**: `/src/components/SummaryInsights.tsx`

## Third-Party Integrations

### Brevo Integration

#### 1. Save Brevo Credentials
- **Endpoint**: `POST /brevo-oauth/save-credentials`
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "user_id": string,
    "api_key": string
  }
  ```
- **Used in**: 
  - `/src/components/IntegrationsPage.tsx`
  - `/src/components/BrevoApiKeyModal.tsx`
  - `/src/components/BrevoConnectionModal.tsx`

### HubSpot Integration

#### 1. Get HubSpot Auth URL
- **Endpoint**: `GET /api/oauth/hubspot/auth-url`
- **Query Params**: `session_id`
- **Used in**: `/src/components/IntegrationsPage.tsx`

## Dependencies and Architecture

### Key Dependencies
1. **axios**: HTTP client library (installed but `apiFetch` is primarily used)
2. **@tanstack/react-query**: Data fetching and caching library
3. **zustand**: State management

### API Communication Pattern
1. All API calls use the `apiFetch` wrapper from `/src/utils/api.ts`
2. Session management is handled via `X-Session-ID` header
3. Authentication state is managed by `SessionContext`
4. Service classes handle domain-specific API calls:
   - `metaAuth.ts`: Meta authentication
   - `metaAds.ts`: Meta advertising data
   - `auth.ts`: Google authentication
   - `accountService.ts`: Account management

## SDK Overview

A reusable, typed SDK now lives in `src/sdk`. It exposes a configurable `ApiClient` plus a convenient `MiaSDK` facade that wires up every endpoint listed in this document.

### Entry points
- `src/sdk/client.ts`: low-level `ApiClient` + error type
- `src/sdk/types.ts`: response/request contracts for all endpoints
- `src/sdk/services/*`: domain-specific abstractions (auth, session, accounts, Meta ads, MCP, insights, integrations)
- `src/sdk/index.ts`: exports `MiaSDK`, the individual services, and helpers

### Creating an instance
```ts
import { MiaSDK } from '@/sdk'

const sdk = new MiaSDK({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  apiKey: import.meta.env.VITE_MIA_API_KEY,         // optional
  apiKeyHeader: 'Authorization',                    // defaults to 'X-API-Key'
  apiKeyPrefix: 'Bearer ',                          // optional helper
  defaultSessionId: localStorage.getItem('mia_session_id') ?? undefined
})

// You can update auth context at runtime
sdk.setSessionId('session_xyz')
sdk.setApiKey('new-token')

// Use any namespaced service
const { auth, accounts, insights } = sdk
const authUrl = await auth.getAuthUrl()
const availableAccounts = await accounts.getAvailable()
const chatReply = await insights.sendChatMessage({
  message: 'Where can we improve?',
  session_id: sdk.client.sessionId!,
  user_id: '106540664695114193744'
})
```

### Service map
- `sdk.auth`: Google OAuth + bypass helpers (`/api/oauth/google/*`, `/api/oauth/bypass-login`)
- `sdk.metaAuth`: Meta OAuth + status (`/api/oauth/meta/*`)
- `sdk.session`: session validation + MCC selection
- `sdk.accounts`: account discovery, selection, platform linking, Google Ads hierarchies
- `sdk.metaAds`: Meta ad account/campaign/adset/ad data + account linking UI feeds
- `sdk.mcp`: MCP bridges for Google Ads + GA4 tools
- `sdk.insights`: chat, growth/improve/fix flows, quick insights, creative analysis
- `sdk.integrations`: Brevo credential flows + HubSpot OAuth URLs

Every method accepts an optional `sessionId`, so you can scope calls per user without mutating global state.

### Error Handling
- API errors are caught and logged at the component level
- Failed authentication redirects to login
- Network errors show user-friendly messages

## Migration Strategy

To separate the API logic into a standalone codebase:

### 1. Create API Client Package
Create a new TypeScript package with:
- All service classes (`auth.ts`, `metaAuth.ts`, `metaAds.ts`, `accountService.ts`)
- The `api.ts` utility functions
- Type definitions for all API responses

### 2. Environment Configuration
- Move `VITE_API_BASE_URL` to a configuration object
- Support multiple environment configurations

### 3. Dependency Injection
- Remove direct imports of `sessionStorage` and `localStorage`
- Pass storage adapters as configuration

### 4. Export Structure
```typescript
export {
  // Core
  ApiClient,
  
  // Services
  AuthService,
  MetaAuthService,
  MetaAdsService,
  AccountService,
  
  // Types
  AuthUser,
  MetaAccount,
  GoogleAccount,
  // ... other types
  
  // Utils
  createApiUrl,
  apiFetch
}
```

### 5. Usage in Frontend
```typescript
import { ApiClient } from '@mia/api-client';

const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  storage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key)
  }
});
```

### 6. Testing
- Add comprehensive unit tests for all API methods
- Mock API responses for frontend testing
- Add integration tests for critical flows

This separation will allow the API client to be:
- Reused in other frontends (mobile, desktop)
- Tested independently
- Versioned separately
- Published as an NPM package
