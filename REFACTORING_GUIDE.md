# SDK Refactoring Guide

## Overview

This guide shows how to migrate from raw `apiFetch` calls to using the centralized SDK with automatic session management.

## What Changed

### Before (Raw apiFetch)
```tsx
// Manual session management
import { apiFetch } from '../utils/api'

const response = await apiFetch('/api/oauth/google/auth-url')

// Manual headers for session
const statusResponse = await apiFetch('/api/oauth/google/status', {
  headers: {
    'X-Session-ID': state.sessionId || ''
  }
})
```

### After (SDK)
```tsx
// Automatic session management
import { getGlobalSDK } from '../sdk'

const sdk = getGlobalSDK()

const response = await sdk.session.getGoogleAuthUrl()
const statusResponse = await sdk.session.checkGoogleAuthStatus()
// Session ID is handled automatically by the SDK!
```

## Benefits

1. **No Manual Session Management**: Session IDs are handled internally
2. **Consistent Error Handling**: All responses use `APIResponse<T>` format
3. **Type Safety**: Full TypeScript support with proper return types
4. **Centralized Logic**: All API calls go through SDK services
5. **Easy Testing**: Mock SDK services instead of individual fetch calls

## Migration Steps

### 1. Analytics Context

Replace:
```tsx
const response = await apiFetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-ID': sessionId || ''
  },
  body: JSON.stringify(requestBody)
})
```

With:
```tsx
const response = await sdk.analytics.getSummaryInsights(requestBody)
```

### 2. Integrations Context

Replace:
```tsx
const statusResponse = await apiFetch('/api/integrations/platform-status', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-ID': sessionId || ''
  },
  body: JSON.stringify(requestBody)
})
```

With:
```tsx
const statusResponse = await sdk.integrations.getPlatformStatus(requestBody)
```

### 3. Session Context

Use the new `SessionService`:
```tsx
// Replace manual OAuth flows
const result = await sdk.session.loginGoogleWithPopup()
const accounts = await sdk.session.getAvailableAccounts()
const selection = await sdk.session.selectAccount(accountId)
```

## Complete Migration Checklist

- [ ] Update `analytics-context.tsx` to use `sdk.analytics`
- [ ] Update `integrations-context.tsx` to use `sdk.integrations`  
- [ ] Replace `session-context.tsx` with refactored version using `sdk.session`
- [ ] Update any other files using `apiFetch` to use appropriate SDK services
- [ ] Remove unused `apiFetch` imports
- [ ] Test all flows to ensure session management works correctly

## Global SDK Setup

The SDK is automatically available via `getGlobalSDK()`:

```tsx
import { getGlobalSDK } from '../sdk'

// In any component or context
const sdk = getGlobalSDK()

// Session ID is automatically managed
const result = await sdk.auth.checkStatus()
```

## Error Handling Pattern

All SDK methods return `APIResponse<T>`:

```tsx
const result = await sdk.session.loginGoogleWithPopup()

if (result.success) {
  console.log('Success:', result.data)
} else {
  console.error('Error:', result.error)
}
```

## Custom Services

If you need additional API endpoints, add them to existing services or create new ones:

```tsx
// In src/sdk/services/my-service.ts
export class MyService {
  constructor(private client: APIClient) {}

  async myMethod(): Promise<APIResponse<MyData>> {
    return this.client.post<MyData>('/api/my-endpoint')
  }
}
```

Then add to the SDK factory and you're done!
