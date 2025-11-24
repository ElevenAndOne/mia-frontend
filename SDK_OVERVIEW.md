# MIA Frontend SDK Overview

## Quick Start

The MIA Frontend SDK is a unified, type-safe API client for all backend interactions.

### Basic Usage

```typescript
import { getGlobalSDK } from '@/sdk'

const sdk = getGlobalSDK()

// Check auth status
const authResult = await sdk.auth.checkStatus()
if (authResult.success) {
  console.log('User:', authResult.data?.user_info)
}

// Get insights
const insightsResult = await sdk.analytics.getSummaryInsights({
  session_id: sdk.client.getSessionId()!,
  date_range: '7d'
})

if (insightsResult.success) {
  console.log('Insights:', insightsResult.data)
}
```

## Architecture

```
src/sdk/
├── index.ts              # Main exports
├── client.ts             # Core HTTP client (GET, POST, PUT, DELETE, PATCH)
├── factory.ts            # SDK factory & singleton
├── types.ts              # All type definitions
├── services/
│   ├── auth.ts           # Google OAuth
│   ├── metaAuth.ts       # Meta OAuth
│   ├── metaAds.ts        # Meta Ads API
│   ├── accounts.ts       # Account management
│   ├── analytics.ts      # Analytics & insights
│   ├── integrations.ts   # HubSpot, Brevo, Figma
│   └── mcp.ts            # MCP tool execution
└── README.md             # Full documentation
```

## Core Features

### 1. Type Safety
All API responses are typed:
```typescript
const result = await sdk.auth.checkStatus()
// result.data is typed as GoogleAuthStatus | undefined
```

### 2. Consistent Error Handling
All methods return `APIResponse<T>`:
```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

### 3. Automatic Session Management
Session IDs are handled automatically:
```typescript
const sdk = getGlobalSDK()
// Session ID is auto-generated and persisted
// Included in all requests automatically
```

### 4. Environment Detection
API base URL auto-detected:
- Production: `https://dolphin-app-b869e.ondigitalocean.app`
- Development: `http://localhost:8000`
- Custom: Set `VITE_API_BASE_URL`

## Services

### Auth Service
```typescript
sdk.auth.checkStatus()
sdk.auth.loginWithPopup()
sdk.auth.loginWithRedirect()
sdk.auth.logout()
sdk.auth.forceLogout()
```

### Meta Auth Service
```typescript
sdk.metaAuth.getAuthUrl()
sdk.metaAuth.exchangeCode(code)
sdk.metaAuth.getUserInfo()
sdk.metaAuth.checkStatus()
sdk.metaAuth.logout()
```

### Meta Ads Service
```typescript
sdk.metaAds.getAccounts()
sdk.metaAds.getCampaigns(accountId, includeMetrics)
sdk.metaAds.getAccountPerformance(accountId, startDate, endDate)
sdk.metaAds.getAdSets(accountId, campaignId?)
sdk.metaAds.getAds(accountId, adSetId?)
```

### Accounts Service
```typescript
sdk.accounts.getGoogleAdsAccounts()
sdk.accounts.getGA4Properties()
sdk.accounts.getAccountMappings()
sdk.accounts.selectAccount(accountId, industry?)
```

### Analytics Service
```typescript
sdk.analytics.analyzeCreative(request)
sdk.analytics.getGrowthData(request)
sdk.analytics.getImproveData(request)
sdk.analytics.getFixData(request)
sdk.analytics.getSummaryInsights(request)
sdk.analytics.getOptimizeInsights(request)
sdk.analytics.getProtectInsights(request)
```

### Integrations Service
```typescript
sdk.integrations.getHubSpotAccounts()
sdk.integrations.saveBrevoApiKey(request)
sdk.integrations.connectBrevo(apiKey)
sdk.integrations.getBrevoStatus()
sdk.integrations.getFigmaAuthUrl()
sdk.integrations.getFigmaStatus()
```

### MCP Service
```typescript
sdk.mcp.executeTool<T>(request)
sdk.mcp.getGoogleAdsAccounts()
sdk.mcp.getGA4Properties()
```

## Common Patterns

### Pattern 1: Check & Use
```typescript
const result = await sdk.auth.checkStatus()

if (!result.success) {
  console.error('Error:', result.error)
  return
}

// Safe to use result.data
const user = result.data
```

### Pattern 2: React Hook
```typescript
import { getGlobalSDK } from '@/sdk'

export function useMiaSDK() {
  return useMemo(() => getGlobalSDK(), [])
}

// In component:
const sdk = useMiaSDK()
```

### Pattern 3: Loading States
```typescript
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const fetchData = async () => {
  setLoading(true)
  setError(null)
  
  const result = await sdk.analytics.getSummaryInsights(request)
  
  if (!result.success) {
    setError(result.error || 'Failed to fetch')
    setLoading(false)
    return
  }
  
  setData(result.data)
  setLoading(false)
}
```

## Migration from Legacy

### Before
```typescript
import { apiFetch } from '@/utils/api'

const response = await apiFetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-ID': sessionId
  },
  body: JSON.stringify(data)
})

if (!response.ok) throw new Error('Failed')
const json = await response.json()
```

### After
```typescript
import { getGlobalSDK } from '@/sdk'

const sdk = getGlobalSDK()
const result = await sdk.serviceName.methodName(data)

if (!result.success) {
  console.error(result.error)
  return
}

const data = result.data
```

## Benefits

1. **Type Safety**: Full TypeScript support with inference
2. **DRY**: No repeated fetch/header logic
3. **Testable**: Easy to mock in tests
4. **Maintainable**: Single source of truth
5. **Consistent**: Uniform error handling
6. **Session Management**: Automatic session ID handling
7. **Environment Aware**: Auto-detects API URLs

## Files

- **SDK Core**: `src/sdk/`
- **Documentation**: 
  - `src/sdk/README.md` - Full API reference
  - `SDK_MIGRATION_GUIDE.md` - Migration instructions
  - `SDK_OVERVIEW.md` - This file
- **Example Service**: `src/services/authSDK.ts` - SDK-based auth service

## Best Practices

1. ✅ Always check `result.success` before using `result.data`
2. ✅ Use `getGlobalSDK()` for singleton access
3. ✅ Let SDK handle session IDs automatically
4. ✅ Provide helpful error messages from `result.error`
5. ✅ Use TypeScript inference for response types
6. ❌ Don't use direct `fetch()` or `apiFetch()`
7. ❌ Don't manually construct headers
8. ❌ Don't manually manage session IDs

## Example: Complete Component

```typescript
import { useState, useEffect } from 'react'
import { getGlobalSDK } from '@/sdk'

export function MyComponent() {
  const sdk = getGlobalSDK()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      const result = await sdk.analytics.getSummaryInsights({
        session_id: sdk.client.getSessionId()!,
        date_range: '7d'
      })
      
      if (!result.success) {
        setError(result.error || 'Failed to fetch data')
        setLoading(false)
        return
      }
      
      setData(result.data)
      setLoading(false)
    }
    
    fetchData()
  }, [sdk])
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return <div>No data</div>
  
  return <div>{/* Render data */}</div>
}
```

## Testing

```typescript
import { createMiaSDK } from '@/sdk'

describe('MyComponent', () => {
  it('should handle errors', async () => {
    const testSDK = createMiaSDK({
      baseURL: 'http://test-api',
      sessionId: 'test-session'
    })
    
    // Mock SDK methods...
  })
})
```

## Summary

The SDK provides a modern, type-safe, maintainable way to interact with all backend APIs. It eliminates boilerplate, ensures consistency, and makes the codebase more maintainable.

For detailed documentation, see `src/sdk/README.md`.
For migration instructions, see `SDK_MIGRATION_GUIDE.md`.
