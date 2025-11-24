# SDK Quick Reference

One-liner examples for common tasks.

## Import

```typescript
import { getGlobalSDK } from '@/sdk'
const sdk = getGlobalSDK()
```

## Authentication

```typescript
// Check if user is logged in
const { success, data } = await sdk.auth.checkStatus()
const isLoggedIn = success && data?.authenticated

// Login with popup
await sdk.auth.loginWithPopup()

// Logout
await sdk.auth.logout()

// Get session ID
const sessionId = sdk.client.getSessionId()
```

## Meta Ads

```typescript
// Get Meta ad accounts
const accounts = await sdk.metaAds.getAccounts()

// Get campaigns
const campaigns = await sdk.metaAds.getCampaigns('act_123')

// Get performance metrics
const metrics = await sdk.metaAds.getAccountPerformance('act_123', '2024-01-01', '2024-01-31')
```

## Analytics

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
const creative = await sdk.analytics.analyzeCreative({
  question: 'What creative performs best?',
  category: 'creative'
})
```

## Accounts

```typescript
// Get Google Ads accounts
const adsAccounts = await sdk.accounts.getGoogleAdsAccounts()

// Get GA4 properties
const ga4Props = await sdk.accounts.getGA4Properties()

// Select account
await sdk.accounts.selectAccount('account-123', 'retail')
```

## Error Handling

```typescript
// Pattern 1: Simple check
const result = await sdk.auth.checkStatus()
if (!result.success) {
  console.error(result.error)
  return
}

// Pattern 2: With fallback
const result = await sdk.metaAds.getAccounts()
const accounts = result.data || []

// Pattern 3: With state
const [error, setError] = useState<string | null>(null)
const result = await sdk.analytics.getSummaryInsights(req)
if (!result.success) {
  setError(result.error || 'Failed')
}
```

## React Patterns

```typescript
// Hook pattern
const useMiaSDK = () => useMemo(() => getGlobalSDK(), [])

// In component
function MyComponent() {
  const sdk = useMiaSDK()
  
  useEffect(() => {
    sdk.auth.checkStatus().then(result => {
      if (result.success) setUser(result.data)
    })
  }, [sdk])
}

// Loading state
const [loading, setLoading] = useState(false)
setLoading(true)
const result = await sdk.analytics.getSummaryInsights(req)
setLoading(false)
if (result.success) setData(result.data)
```

## Custom Requests

```typescript
// GET request
const result = await sdk.client.get('/api/custom-endpoint')

// POST request
const result = await sdk.client.post('/api/custom-endpoint', {
  data: 'value'
})

// With query params
const result = await sdk.client.get('/api/endpoint', {
  params: { id: '123', filter: 'active' }
})
```

## Session Management

```typescript
// Get session ID
const sessionId = sdk.client.getSessionId()

// Set custom session ID
sdk.client.setSessionId('custom-session-123')

// Clear session
sdk.client.clearSessionId()
```

## Integration Examples

```typescript
// HubSpot accounts
const hubspot = await sdk.integrations.getHubSpotAccounts()

// Brevo API key
await sdk.integrations.saveBrevoApiKey({
  api_key: 'xkeysib-...',
  session_id: sdk.client.getSessionId()!
})

// Figma auth
const figma = await sdk.integrations.getFigmaAuthUrl()
if (figma.success) window.location.href = figma.data!.auth_url
```

## Type-Safe Responses

```typescript
// TypeScript infers the response type
const result = await sdk.auth.checkStatus()

if (result.success && result.data) {
  // TypeScript knows: result.data is GoogleAuthStatus
  const email = result.data.user_info.email // ✅ Type-safe!
}
```

## Cheat Sheet

| Task | Code |
|------|------|
| Get SDK | `const sdk = getGlobalSDK()` |
| Check auth | `await sdk.auth.checkStatus()` |
| Login | `await sdk.auth.loginWithPopup()` |
| Logout | `await sdk.auth.logout()` |
| Get insights | `await sdk.analytics.getSummaryInsights(req)` |
| Get accounts | `await sdk.accounts.getGoogleAdsAccounts()` |
| Get campaigns | `await sdk.metaAds.getCampaigns(accountId)` |
| Select account | `await sdk.accounts.selectAccount(id, industry)` |
| Session ID | `sdk.client.getSessionId()` |
| Custom GET | `await sdk.client.get(path)` |
| Custom POST | `await sdk.client.post(path, body)` |

## Common Patterns

### Load data on mount
```typescript
useEffect(() => {
  const load = async () => {
    const result = await sdk.analytics.getSummaryInsights(req)
    if (result.success) setData(result.data)
  }
  load()
}, [])
```

### Handle form submission
```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  const result = await sdk.accounts.selectAccount(accountId)
  if (result.success) navigate('/dashboard')
  else setError(result.error)
}
```

### Conditional render
```typescript
const result = await sdk.auth.checkStatus()
if (result.success && result.data?.authenticated) {
  return <Dashboard />
}
return <Login />
```

### Parallel requests
```typescript
const [auth, accounts, insights] = await Promise.all([
  sdk.auth.checkStatus(),
  sdk.accounts.getGoogleAdsAccounts(),
  sdk.analytics.getSummaryInsights(req)
])
```

That's it! For full documentation, see `src/sdk/README.md`.
