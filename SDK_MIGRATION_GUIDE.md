# SDK Migration Guide

This guide explains how to migrate from the legacy API patterns to the new unified SDK.

## Overview

The new SDK provides:
- ✅ Type-safe API calls
- ✅ Consistent error handling
- ✅ Automatic session management
- ✅ Single source of truth for all API interactions
- ✅ Better testability and maintainability

## Migration Path

### Phase 1: SDK Foundation (✅ Complete)
- [x] Create core SDK client
- [x] Implement all service modules
- [x] Add comprehensive type definitions
- [x] Build factory pattern with singleton support

### Phase 2: Service Layer Migration (In Progress)
- [ ] Update `src/services/auth.ts` to use SDK
- [ ] Update `src/services/metaAuth.ts` to use SDK
- [ ] Update `src/services/metaAds.ts` to use SDK
- [ ] Update `src/services/accountService.ts` to use SDK

### Phase 3: Component Migration
- [ ] Update SessionContext to use SDK
- [ ] Update components with direct API calls
- [ ] Remove direct `apiFetch` usage
- [ ] Remove direct `fetch` usage

### Phase 4: Cleanup
- [ ] Deprecate legacy `src/utils/api.ts`
- [ ] Remove old service files
- [ ] Update all imports

## Migration Examples

### Example 1: Auth Service

#### Before
```typescript
import { apiFetch } from '../utils/api'

const response = await apiFetch('/api/oauth/google/status', {
  headers: {
    'X-Session-ID': sessionStorage.getItem('session_id') || ''
  }
})

if (!response.ok) {
  throw new Error('Failed to check status')
}

const data = await response.json()
if (data.authenticated) {
  // Handle authenticated user
}
```

#### After
```typescript
import { getGlobalSDK } from '@/sdk'

const sdk = getGlobalSDK()
const result = await sdk.auth.checkStatus()

if (result.success && result.data?.authenticated) {
  // Handle authenticated user - data is typed!
  console.log(result.data.user_info.email)
}
```

### Example 2: Meta Ads Service

#### Before
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const response = await fetch(`${API_BASE_URL}/api/oauth/meta/accounts`, {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-ID': sessionStorage.getItem('session_id') || ''
  }
})

if (!response.ok) {
  throw new Error(`Failed to fetch: ${response.status}`)
}

return await response.json()
```

#### After
```typescript
import { getGlobalSDK } from '@/sdk'

const sdk = getGlobalSDK()
const result = await sdk.metaAds.getAccounts()

if (!result.success) {
  console.error('Failed to fetch accounts:', result.error)
  return []
}

return result.data || []
```

### Example 3: Analytics in Components

#### Before
```typescript
import { apiFetch } from '../utils/api'

const fetchData = async () => {
  try {
    const response = await apiFetch('/api/quick-insights/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        date_range: selectedDateRange
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (result.success) {
      setSummary(result.summary)
    }
  } catch (error) {
    console.error('Error:', error)
    setError('Failed to fetch')
  }
}
```

#### After
```typescript
import { getGlobalSDK } from '@/sdk'

const fetchData = async () => {
  const sdk = getGlobalSDK()
  
  const result = await sdk.analytics.getSummaryInsights({
    session_id: sdk.client.getSessionId()!,
    date_range: selectedDateRange
  })

  if (!result.success) {
    setError(result.error || 'Failed to fetch')
    return
  }

  setSummary(result.data?.summary)
}
```

### Example 4: Account Selection

#### Before
```typescript
const response = await apiFetch('/api/accounts/select', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-ID': state.sessionId
  },
  body: JSON.stringify({
    account_id: accountId,
    session_id: state.sessionId,
    industry: industry
  })
})

if (response.ok) {
  // Success
  return true
}
throw new Error('Failed to select account')
```

#### After
```typescript
import { getGlobalSDK } from '@/sdk'

const sdk = getGlobalSDK()
const result = await sdk.accounts.selectAccount(accountId, industry)

if (!result.success) {
  throw new Error(result.error || 'Failed to select account')
}

return true
```

## Pattern Reference

### ✅ DO: Use SDK for All API Calls

```typescript
import { getGlobalSDK } from '@/sdk'

const sdk = getGlobalSDK()
const result = await sdk.auth.checkStatus()
```

### ❌ DON'T: Use Direct fetch or apiFetch

```typescript
// ❌ Avoid this
import { apiFetch } from '@/utils/api'
const response = await apiFetch('/api/endpoint')
```

### ✅ DO: Check Success Before Using Data

```typescript
const result = await sdk.analytics.getSummaryInsights(request)

if (!result.success) {
  handleError(result.error)
  return
}

// Safe to use result.data
const summary = result.data
```

### ❌ DON'T: Assume Success

```typescript
// ❌ Avoid this
const result = await sdk.analytics.getSummaryInsights(request)
const summary = result.data // Could be undefined!
```

### ✅ DO: Use Type Inference

```typescript
const result = await sdk.auth.checkStatus()

if (result.success && result.data) {
  // TypeScript knows the shape of result.data!
  const email = result.data.user_info.email
}
```

### ✅ DO: Handle Errors Gracefully

```typescript
const result = await sdk.metaAds.getAccounts()

if (!result.success) {
  setError(result.error || 'Unknown error occurred')
  setLoading(false)
  return
}

setAccounts(result.data || [])
```

## Session Management

The SDK automatically handles session IDs:

### Before
```typescript
// Manual session management
const sessionId = localStorage.getItem('mia_session_id') || 
                  sessionStorage.getItem('session_id') || 
                  generateNewSessionId()

fetch(url, {
  headers: {
    'X-Session-ID': sessionId
  }
})
```

### After
```typescript
// Automatic session management
const sdk = getGlobalSDK()
// Session ID is automatically included in all requests

// Access session ID if needed
const sessionId = sdk.client.getSessionId()

// Update session ID if needed
sdk.client.setSessionId('new-session-id')
```

## React Integration

### Custom Hook Pattern

```typescript
// hooks/useMiaSDK.ts
import { useMemo } from 'react'
import { getGlobalSDK } from '@/sdk'

export function useMiaSDK() {
  return useMemo(() => getGlobalSDK(), [])
}
```

Usage in components:

```typescript
import { useMiaSDK } from '@/hooks/useMiaSDK'

function MyComponent() {
  const sdk = useMiaSDK()
  
  useEffect(() => {
    sdk.auth.checkStatus().then(result => {
      if (result.success) {
        setUser(result.data)
      }
    })
  }, [sdk])
}
```

## Testing

The SDK makes testing easier:

```typescript
import { createMiaSDK } from '@/sdk'

describe('MyComponent', () => {
  it('should fetch data', async () => {
    // Create test SDK with custom config
    const testSDK = createMiaSDK({
      baseURL: 'http://localhost:3000',
      sessionId: 'test-session'
    })
    
    // Mock responses...
  })
})
```

## Rollback Plan

If issues arise, the legacy code remains untouched:

1. **Service Layer**: Original files in `src/services/*.ts` are unchanged
2. **API Utility**: `src/utils/api.ts` still works
3. **Components**: Existing imports continue to function

To rollback a specific service:
```typescript
// Simply change the import
// From: import { authService } from '@/services/authSDK'
// To:   import { authService } from '@/services/auth'
```

## Migration Checklist

When migrating a file:

- [ ] Import SDK: `import { getGlobalSDK } from '@/sdk'`
- [ ] Replace fetch/apiFetch calls with SDK methods
- [ ] Update error handling to use `result.success`
- [ ] Remove manual session ID management
- [ ] Remove manual header construction
- [ ] Add type annotations where helpful
- [ ] Test the migration
- [ ] Update imports in dependent files

## Common Issues

### Issue: "Module has no exported member"
**Solution**: Ensure you're importing from the correct path
```typescript
// ✅ Correct
import { getGlobalSDK } from '@/sdk'

// ❌ Wrong
import { getGlobalSDK } from '@/sdk/factory'
```

### Issue: "Property 'data' may be undefined"
**Solution**: Check success before accessing data
```typescript
if (result.success && result.data) {
  // Safe to use result.data
}
```

### Issue: "Session ID is null"
**Solution**: Session ID is generated automatically on first access
```typescript
const sdk = getGlobalSDK()
const sessionId = sdk.client.getSessionId() // Always returns a string
```

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| Type Safety | ❌ Manual typing | ✅ Full TypeScript support |
| Error Handling | ❌ Inconsistent | ✅ Standardized |
| Session Management | ❌ Manual | ✅ Automatic |
| Code Duplication | ❌ High | ✅ Minimal |
| Testing | ❌ Difficult | ✅ Easy |
| Maintainability | ❌ Scattered | ✅ Centralized |

## Next Steps

1. Review this guide
2. Start with one service (recommended: auth)
3. Test thoroughly
4. Gradually migrate other services
5. Update components
6. Clean up legacy code

## Support

For questions or issues:
1. Check the SDK README: `src/sdk/README.md`
2. Review existing SDK code for patterns
3. Consult this migration guide
