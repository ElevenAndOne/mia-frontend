# MIA Frontend SDK

A unified, type-safe SDK for all API interactions in the MIA frontend application.

## Features

- 🔒 **Type-safe** - Full TypeScript support with comprehensive type definitions
- 🎯 **Unified API** - Single interface for all backend services
- 🔄 **Consistent Error Handling** - Standardized error responses across all endpoints
- 📦 **Modular Services** - Organized by domain (auth, analytics, accounts, etc.)
- 🔑 **Session Management** - Automatic session ID handling and storage
- 🌐 **Environment Aware** - Automatic API base URL detection

## Installation

The SDK is located in `src/sdk` and can be imported directly:

```typescript
import { createMiaSDK, getGlobalSDK } from '@/sdk'
```

## Quick Start

### Create SDK Instance

```typescript
import { createMiaSDK } from '@/sdk'

// Create a new SDK instance
const sdk = createMiaSDK({
  debug: true, // Enable debug logging
  sessionId: 'custom-session-id' // Optional custom session ID
})
```

### Use Global Singleton

```typescript
import { getGlobalSDK } from '@/sdk'

// Get global SDK instance (creates one if it doesn't exist)
const sdk = getGlobalSDK()
```

## Services

### Auth Service

Google OAuth authentication.

```typescript
// Check authentication status
const status = await sdk.auth.checkStatus()
if (status.success && status.data?.authenticated) {
  console.log('User email:', status.data.user_info.email)
}

// Login with popup
const result = await sdk.auth.loginWithPopup()
if (result.success) {
  console.log('Login successful!')
}

// Logout
await sdk.auth.logout()
```

### Meta Auth Service

Meta (Facebook) OAuth authentication.

```typescript
// Get auth URL
const authUrlResult = await sdk.metaAuth.getAuthUrl()
if (authUrlResult.success) {
  window.location.href = authUrlResult.data!.auth_url
}

// Check status
const status = await sdk.metaAuth.checkStatus()

// Logout
await sdk.metaAuth.logout()
```

### Meta Ads Service

Meta advertising platform integration.

```typescript
// Get ad accounts
const accounts = await sdk.metaAds.getAccounts()
if (accounts.success) {
  console.log('Ad accounts:', accounts.data)
}

// Get campaigns
const campaigns = await sdk.metaAds.getCampaigns('act_123456789', true)

// Get performance metrics
const metrics = await sdk.metaAds.getAccountPerformance(
  'act_123456789',
  '2024-01-01',
  '2024-01-31'
)
```

### Accounts Service

Account management and selection.

```typescript
// Get Google Ads accounts
const adsAccounts = await sdk.accounts.getGoogleAdsAccounts()

// Get GA4 properties
const ga4Properties = await sdk.accounts.getGA4Properties()

// Select an account
await sdk.accounts.selectAccount('account-id-123', 'retail')
```

### Analytics Service

Marketing analytics and insights.

```typescript
// Get summary insights
const summary = await sdk.analytics.getSummaryInsights({
  session_id: sdk.client.getSessionId()!,
  date_range: '7d'
})

// Get optimize insights
const optimize = await sdk.analytics.getOptimizeInsights({
  session_id: sdk.client.getSessionId()!,
  date_range: '30d'
})

// Creative analysis
const analysis = await sdk.analytics.analyzeCreative({
  question: 'What creative is performing best?',
  category: 'creative',
  start_date: '2024-01-01',
  end_date: '2024-01-31'
})
```

### Integrations Service

Third-party integrations (HubSpot, Brevo, Figma).

```typescript
// Get HubSpot accounts
const hubspotAccounts = await sdk.integrations.getHubSpotAccounts()

// Save Brevo API key
await sdk.integrations.saveBrevoApiKey({
  api_key: 'xkeysib-...',
  session_id: sdk.client.getSessionId()!
})

// Check Brevo status
const brevoStatus = await sdk.integrations.getBrevoStatus()
```

### MCP Service

Model Context Protocol tools.

```typescript
// Execute generic MCP tool
const result = await sdk.mcp.executeTool({
  tool: 'custom_tool',
  param1: 'value1'
})

// Get Google Ads accounts via MCP
const adsAccounts = await sdk.mcp.getGoogleAdsAccounts()

// Get GA4 properties via MCP
const ga4Props = await sdk.mcp.getGA4Properties()
```

## Core Client

The `APIClient` provides low-level HTTP methods.

```typescript
// Direct API calls
const response = await sdk.client.get('/api/custom-endpoint')
const postResponse = await sdk.client.post('/api/custom-endpoint', { data: 'value' })

// Session management
const sessionId = sdk.client.getSessionId()
sdk.client.setSessionId('new-session-id')
sdk.client.clearSessionId()
```

## Response Format

All SDK methods return a consistent `APIResponse<T>` format:

```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

Example usage:

```typescript
const result = await sdk.auth.checkStatus()

if (result.success) {
  // Access data safely
  console.log('User:', result.data?.user_info)
} else {
  // Handle error
  console.error('Error:', result.error)
}
```

## Error Handling

The SDK provides consistent error handling:

```typescript
const result = await sdk.analytics.getSummaryInsights({
  session_id: sdk.client.getSessionId()!,
  date_range: '7d'
})

if (!result.success) {
  // Handle HTTP errors, network errors, or API errors
  console.error('Failed to fetch insights:', result.error)
  return
}

// Safe to use result.data
const insights = result.data
```

## Configuration

### Debug Mode

Enable debug mode to log all requests:

```typescript
const sdk = createMiaSDK({ debug: true })
```

### Custom Base URL

Override the API base URL:

```typescript
const sdk = createMiaSDK({
  baseURL: 'https://custom-api.example.com'
})
```

### Custom Session ID

Provide a custom session ID:

```typescript
const sdk = createMiaSDK({
  sessionId: 'my-custom-session-id'
})
```

## Migration from Legacy Services

### Before (using direct fetch/apiFetch)

```typescript
import { apiFetch } from '@/utils/api'

const response = await apiFetch('/api/oauth/google/status', {
  headers: {
    'X-Session-ID': sessionStorage.getItem('session_id') || ''
  }
})

if (!response.ok) {
  throw new Error('Failed to check status')
}

const data = await response.json()
```

### After (using SDK)

```typescript
import { getGlobalSDK } from '@/sdk'

const sdk = getGlobalSDK()
const result = await sdk.auth.checkStatus()

if (!result.success) {
  console.error(result.error)
  return
}

const data = result.data
```

## Best Practices

1. **Use Global SDK for React Components**
   ```typescript
   import { getGlobalSDK } from '@/sdk'
   
   function MyComponent() {
     const sdk = getGlobalSDK()
     // Use sdk...
   }
   ```

2. **Check Success Before Using Data**
   ```typescript
   const result = await sdk.auth.checkStatus()
   if (result.success) {
     // Safe to use result.data
   }
   ```

3. **Handle Errors Gracefully**
   ```typescript
   const result = await sdk.analytics.getSummaryInsights(request)
   if (!result.success) {
     setError(result.error || 'Unknown error')
     return
   }
   ```

4. **Type Your Responses**
   ```typescript
   const result = await sdk.client.get<MyCustomType>('/api/custom')
   if (result.success) {
     const typed: MyCustomType = result.data!
   }
   ```

## Architecture

```
sdk/
├── index.ts              # Main exports
├── client.ts             # Core HTTP client
├── factory.ts            # SDK factory and singleton
├── types.ts              # Type definitions
├── services/
│   ├── index.ts          # Service exports
│   ├── auth.ts           # Google Auth
│   ├── metaAuth.ts       # Meta Auth
│   ├── metaAds.ts        # Meta Ads
│   ├── accounts.ts       # Account management
│   ├── analytics.ts      # Analytics & insights
│   ├── integrations.ts   # Third-party integrations
│   └── mcp.ts            # MCP tools
└── README.md             # This file
```

## Contributing

When adding new API endpoints:

1. Add types to `types.ts`
2. Add methods to appropriate service in `services/`
3. Update this README with examples
4. Ensure consistent error handling and response formats
