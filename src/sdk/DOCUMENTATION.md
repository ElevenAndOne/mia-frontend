
# MIA SDK Documentation

A comprehensive TypeScript SDK for the MIA frontend that provides typed access to all backend services including authentication, account management, Meta integrations, MCP tools, insights, and third-party integrations.

## Table of Contents
- [Quick Start](#quick-start)
- [Installation & Setup](#installation--setup)
- [Core Concepts](#core-concepts)
- [Services](#services)
  - [Authentication Service](#authentication-service)
  - [Session Service](#session-service)
  - [Account Service](#account-service)
  - [Meta Auth Service](#meta-auth-service)
  - [Meta Ads Service](#meta-ads-service)
  - [MCP Service](#mcp-service)
  - [Insights Service](#insights-service)
  - [Integrations Service](#integrations-service)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Quick Start

```typescript
import { MiaSDK } from '@/sdk'

// Initialize the SDK
const sdk = new MiaSDK({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  apiKey: import.meta.env.VITE_MIA_API_KEY,
  defaultSessionId: localStorage.getItem('mia_session_id') ?? undefined
})

// Basic usage
const authUrl = await sdk.auth.getAuthUrl()
const accounts = await sdk.accounts.getAvailable()
```

## Installation & Setup

### SDK Configuration Options

```typescript
interface MiaSdkConfig {
  baseUrl: string              // Required: Backend API URL
  apiKey?: string              // Optional: API key for authentication
  apiKeyHeader?: string        // Default: 'X-API-Key'
  apiKeyPrefix?: string        // Optional: Prefix for API key (e.g., 'Bearer ')
  defaultHeaders?: HeadersInit // Additional headers for all requests
  defaultSessionId?: string    // Session ID to use by default
  fetchFn?: typeof fetch       // Custom fetch implementation
}
```

### Basic Setup

```typescript
// Create SDK instance
const sdk = new MiaSDK({
  baseUrl: 'https://api.mia.ai',
  apiKey: 'your-api-key',
  defaultSessionId: sessionId
})

// Update configuration at runtime
sdk.setSessionId('new-session-id')
sdk.setApiKey('new-api-key')
```

## Core Concepts

### Session Management
Every API call can include a session ID either through the default configuration or per-request override:

```typescript
// Use default session
await sdk.accounts.getAvailable()

// Override for specific request
await sdk.accounts.getAvailable({ sessionId: 'custom-session-id' })
```

### Directory Structure
```
src/sdk/
├── client.ts             // Core ApiClient with fetch wrapper
├── index.ts              // Main SDK export and facade
├── types.ts              // TypeScript interfaces
├── services/
│   ├── baseService.ts    // Base class for all services
│   ├── authService.ts    // Google OAuth operations
│   ├── sessionService.ts // Session validation & MCC selection
│   ├── accountService.ts // Account management
│   ├── metaAuthService.ts // Meta OAuth operations
│   ├── metaAdsService.ts // Meta advertising data
│   ├── mcpService.ts     // MCP tool integrations
│   ├── insightsService.ts // Chat & analytics
│   └── integrationsService.ts // Third-party connectors
└── DOCUMENTATION.md
```

## Services

### Authentication Service

Handles Google OAuth authentication flow and session management.

#### `getAuthUrl(options?: SessionOptions): Promise<AuthUrlResponse>`
Retrieves the Google OAuth authorization URL.

```typescript
// Get auth URL with default session
const response = await sdk.auth.getAuthUrl()
console.log(response.auth_url) // https://accounts.google.com/o/oauth2/v2/auth?...

// With custom session
const response = await sdk.auth.getAuthUrl({ sessionId: 'custom-session' })
```

#### `checkStatus(options?: SessionOptions): Promise<GoogleAuthStatusResponse>`
Checks if the current session is authenticated with Google.

```typescript
const status = await sdk.auth.checkStatus()
if (status.authenticated) {
  console.log('User:', status.user)
  console.log('Selected Account:', status.selected_account)
} else {
  // Redirect to auth flow
}
```

#### `complete(payload: OAuthCompleteRequest, options?: SessionOptions): Promise<ApiSuccessResponse>`
Completes the OAuth flow after user authorization.

```typescript
// After OAuth callback
await sdk.auth.complete({
  session_id: sessionId
})
```

#### `logout(options?: SessionOptions): Promise<ApiSuccessResponse>`
Logs out the user from Google session.

```typescript
await sdk.auth.logout()
// User is logged out, tokens remain valid
```

#### `forceLogout(options?: SessionOptions): Promise<ApiSuccessResponse>`
Force logout with token revocation and complete session cleanup.

```typescript
await sdk.auth.forceLogout()
// All tokens revoked, session completely cleared
```

#### `bypassLogin(options?: SessionOptions): Promise<ApiSuccessResponse>`
Bypass OAuth for testing/development environments.

```typescript
// Development only - creates test session
await sdk.auth.bypassLogin()
```

### Session Service

Manages user sessions and MCC (My Client Center) selection.

#### `validate(sessionId: string, options?: SessionOptions): Promise<SessionValidationResponse>`
Validates a session and returns user/platform status.

```typescript
// Validate current session
const validation = await sdk.session.validate('session-123')

if (validation.valid) {
  console.log('User:', validation.user)
  console.log('Platforms:', validation.platforms)
  console.log('Selected Account:', validation.selected_account)
} else {
  // Session expired, redirect to login
}
```

#### `selectMcc(payload: SelectMccRequest, options?: SessionOptions): Promise<ApiSuccessResponse>`
Selects an MCC account for the current session.

```typescript
// Select MCC during onboarding
await sdk.session.selectMcc({
  session_id: sessionId,
  mcc_id: '123-456-7890'
})

// This scopes all subsequent account operations to this MCC
```

### Account Service

Manages account discovery, selection, and platform linking.

#### `getAvailable(options?: SessionOptions): Promise<AvailableAccountsResponse>`
Retrieves all available accounts including linked platforms and GA4 suggestions.

```typescript
const response = await sdk.accounts.getAvailable()

// Access accounts with their linked platforms
response.accounts.forEach(account => {
  console.log('Account:', account.name)
  console.log('Google Ads ID:', account.google_ads_id)
  console.log('GA4 Properties:', account.ga4_ids)
  console.log('Meta Account:', account.meta_ads_account_id)
})

// Check GA4 property suggestions
response.ga4_property_suggestions.forEach(suggestion => {
  console.log('Suggested GA4:', suggestion.property_name)
})
```

#### `selectAccount(payload: SelectAccountRequest, options?: SessionOptions): Promise<SelectAccountResponse>`
Selects an account as the active working account.

```typescript
const result = await sdk.accounts.selectAccount({
  account_id: 'acc_123',
  session_id: sessionId
})

console.log('Selected account:', result.account)
```

#### `linkPlatform(payload: LinkPlatformRequest, options?: SessionOptions): Promise<LinkPlatformResponse>`
Links a platform (like GA4) to an existing account.

```typescript
// Link GA4 property
const linked = await sdk.accounts.linkPlatform({
  account_id: 'acc_123',
  platform: 'ga4',
  platform_id: 'properties/456789'
})

// Link Meta ads account
const metaLinked = await sdk.accounts.linkPlatform({
  account_id: 'acc_123',
  platform: 'meta',
  platform_id: 'act_987654321'
})
```

#### `getGoogleAdAccounts(userId?: string, options?: SessionOptions): Promise<GoogleAdAccountsResponse>`
Fetches Google Ads accounts, optionally filtered by user ID.

```typescript
// Get all Google Ads accounts
const allAccounts = await sdk.accounts.getGoogleAdAccounts()

// Get accounts for specific user
const userAccounts = await sdk.accounts.getGoogleAdAccounts('user-123')

// Access MCC hierarchy
userAccounts.accounts.forEach(account => {
  console.log('Account:', account.name)
  console.log('Is MCC:', account.is_mcc)
  console.log('Customer ID:', account.customer_id)
})
```

### Meta Auth Service

Handles Meta (Facebook) OAuth authentication and session management.

#### `getAuthUrl(options?: SessionOptions): Promise<AuthUrlResponse>`
Gets the Meta OAuth authorization URL.

```typescript
const response = await sdk.metaAuth.getAuthUrl()
window.open(response.auth_url, '_blank')

// With custom session
const response = await sdk.metaAuth.getAuthUrl({ sessionId: 'custom-session' })
```

#### `exchangeCode(payload: MetaExchangeRequest, options?: SessionOptions): Promise<MetaExchangeResponse>`
Exchanges OAuth code for access tokens.

```typescript
// After Meta OAuth callback
const tokens = await sdk.metaAuth.exchangeCode({
  code: 'oauth-code-from-callback'
})

console.log('Access Token:', tokens.access_token)
console.log('User ID:', tokens.user_id)
```

#### `getUserInfo(options?: SessionOptions): Promise<MetaAuthStatusResponse>`
Retrieves cached Meta user profile information.

```typescript
const userInfo = await sdk.metaAuth.getUserInfo()
console.log('Meta User:', userInfo.user)
console.log('Connected:', userInfo.authenticated)
```

#### `checkStatus(options?: SessionOptions): Promise<MetaAuthStatusResponse>`
Checks Meta authentication status.

```typescript
const status = await sdk.metaAuth.checkStatus()
if (status.authenticated) {
  console.log('Meta connected for user:', status.user)
} else {
  // Show Meta connect button
}
```

#### `complete(payload: OAuthCompleteRequest, options?: SessionOptions): Promise<ApiSuccessResponse>`
Completes Meta OAuth flow.

```typescript
await sdk.metaAuth.complete({
  session_id: sessionId
})
```

#### `logout(options?: SessionOptions): Promise<ApiSuccessResponse>`
Disconnects Meta account.

```typescript
await sdk.metaAuth.logout()
// Meta account disconnected
```

#### `bypassLogin(options?: SessionOptions): Promise<ApiSuccessResponse>`
Bypass Meta OAuth for testing.

```typescript
// Development only
await sdk.metaAuth.bypassLogin()
```

### Meta Ads Service

Manages Meta advertising accounts, campaigns, ad sets, and performance data.

#### `getAccounts(options?: SessionOptions): Promise<MetaAdsAccount[]>`
Retrieves Meta ad accounts for the authenticated user.

```typescript
const accounts = await sdk.metaAds.getAccounts()

accounts.forEach(account => {
  console.log('Account Name:', account.name)
  console.log('Account ID:', account.account_id)
  console.log('Currency:', account.currency)
  console.log('Status:', account.account_status)
})
```

#### `getLinkableAccounts(options?: SessionOptions): Promise<MetaAvailableAccountsResponse>`
Gets accounts available for linking via Meta's account picker.

```typescript
const available = await sdk.metaAds.getLinkableAccounts()

console.log('Available accounts:', available.accounts)
console.log('Already linked:', available.linked_accounts)
```

#### `linkAccount(payload: LinkMetaAccountRequest, options?: SessionOptions): Promise<LinkMetaAccountResponse>`
Links a Meta ad account to the current MIA account.

```typescript
const linked = await sdk.metaAds.linkAccount({
  account_id: 'act_123456789',
  account_name: 'My Business Account'
})

console.log('Linked account:', linked.account)
```

#### `getCampaigns(accountId: string, options?: CampaignRequestOptions): Promise<MetaCampaign[]>`
Fetches campaigns for a Meta ad account.

```typescript
// Get campaigns without metrics
const campaigns = await sdk.metaAds.getCampaigns('act_123456789')

// Get campaigns with performance metrics
const campaignsWithMetrics = await sdk.metaAds.getCampaigns('act_123456789', {
  includeMetrics: true,
  sessionId: 'custom-session'
})

campaignsWithMetrics.forEach(campaign => {
  console.log('Campaign:', campaign.name)
  console.log('Status:', campaign.status)
  console.log('Objective:', campaign.objective)
  if (campaign.metrics) {
    console.log('Spend:', campaign.metrics.spend)
    console.log('Impressions:', campaign.metrics.impressions)
    console.log('Clicks:', campaign.metrics.clicks)
  }
})
```

#### `getAccountPerformance(accountId: string, options: PerformanceRequestOptions): Promise<CampaignMetrics>`
Retrieves performance metrics for a date range.

```typescript
const performance = await sdk.metaAds.getAccountPerformance('act_123456789', {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  sessionId: sessionId
})

console.log('Total Spend:', performance.spend)
console.log('Impressions:', performance.impressions)
console.log('Clicks:', performance.clicks)
console.log('CTR:', performance.ctr)
console.log('CPC:', performance.cpc)
console.log('CPM:', performance.cpm)
```

#### `getAdSets(accountId: string, options?: AdSetRequestOptions): Promise<MetaAdSet[]>`
Fetches ad sets, optionally filtered by campaign.

```typescript
// Get all ad sets
const allAdSets = await sdk.metaAds.getAdSets('act_123456789')

// Get ad sets for specific campaign
const campaignAdSets = await sdk.metaAds.getAdSets('act_123456789', {
  campaignId: 'campaign_123',
  sessionId: sessionId
})

campaignAdSets.forEach(adSet => {
  console.log('Ad Set:', adSet.name)
  console.log('Status:', adSet.status)
  console.log('Budget:', adSet.daily_budget || adSet.lifetime_budget)
  console.log('Targeting:', adSet.targeting)
})
```

#### `getAds(accountId: string, options?: AdRequestOptions): Promise<MetaAd[]>`
Fetches ads, optionally filtered by ad set.

```typescript
// Get all ads
const allAds = await sdk.metaAds.getAds('act_123456789')

// Get ads for specific ad set
const adSetAds = await sdk.metaAds.getAds('act_123456789', {
  adSetId: 'adset_456',
  sessionId: sessionId
})

adSetAds.forEach(ad => {
  console.log('Ad Name:', ad.name)
  console.log('Status:', ad.status)
  console.log('Creative ID:', ad.creative.id)
  if (ad.insights) {
    console.log('Ad Performance:', ad.insights)
  }
})
```

### MCP Service

Integrates with Model Context Protocol tools for Google Ads and GA4 discovery.

#### `getGoogleAdsAccounts(options?: SessionOptions): Promise<McpGoogleAdsResponse>`
Fetches Google Ads accounts via MCP tools.

```typescript
const response = await sdk.mcp.getGoogleAdsAccounts()

// Access MCC hierarchy
response.accounts.forEach(account => {
  console.log('Account:', account.name)
  console.log('Customer ID:', account.customer_id)
  console.log('Is MCC:', account.is_mcc)
  console.log('Manager:', account.manager)
})

// Handle any errors from MCP
if (response.error) {
  console.error('MCP Error:', response.error)
}
```

#### `getGa4Properties(options?: SessionOptions): Promise<McpGa4PropertiesResponse>`
Discovers GA4 properties via MCP tools.

```typescript
const response = await sdk.mcp.getGa4Properties()

// List available properties
response.properties.forEach(property => {
  console.log('Property Name:', property.display_name)
  console.log('Property ID:', property.name) // e.g., "properties/123456"
  console.log('Time Zone:', property.time_zone)
  console.log('Currency:', property.currency_code)
})

// Check for MCP errors
if (response.error) {
  console.error('Failed to fetch GA4 properties:', response.error)
}
```

### Insights Service

Provides AI-powered insights, chat functionality, and creative analysis.

#### `sendChatMessage(payload: ChatRequest, options?: SessionOptions): Promise<ChatResponse>`
Sends a message to the conversational AI assistant.

```typescript
const response = await sdk.insights.sendChatMessage({
  message: 'What are my top performing campaigns?',
  session_id: sessionId,
  user_id: userId,
  conversation_id: 'conv_123' // Optional, for continuing conversations
})

console.log('AI Response:', response.response)
console.log('Conversation ID:', response.conversation_id)
console.log('Suggestions:', response.suggestions)
```

#### `getGrowthData(payload: Omit<InsightQuestionRequest, 'context'>, options?: SessionOptions): Promise<InsightQuestionResponse>`
Gets growth-focused insights and recommendations.

```typescript
const growthInsights = await sdk.insights.getGrowthData({
  question: 'How can I expand into new markets?',
  session_id: sessionId,
  user_id: userId,
  date_range: 'last_30_days'
})

console.log('Growth Recommendations:', growthInsights.insights)
console.log('Action Items:', growthInsights.action_items)
```

#### `getImproveData(payload: Omit<InsightQuestionRequest, 'context'>, options?: SessionOptions): Promise<InsightQuestionResponse>`
Gets optimization and improvement suggestions.

```typescript
const improvements = await sdk.insights.getImproveData({
  question: 'How can I improve my CTR?',
  session_id: sessionId,
  user_id: userId,
  date_range: 'last_7_days'
})

console.log('Optimization Tips:', improvements.insights)
console.log('Metrics Impact:', improvements.metrics_impact)
```

#### `getFixData(payload: Omit<InsightQuestionRequest, 'context'>, options?: SessionOptions): Promise<InsightQuestionResponse>`
Gets troubleshooting help and fixes for issues.

```typescript
const fixes = await sdk.insights.getFixData({
  question: 'Why did my conversions drop last week?',
  session_id: sessionId,
  user_id: userId,
  date_range: 'last_14_days'
})

console.log('Issue Analysis:', fixes.insights)
console.log('Recommended Fixes:', fixes.recommendations)
```

#### `getQuickInsights(type: 'grow' | 'optimize' | 'protect' | 'summary', payload: QuickInsightsRequest, options?: SessionOptions): Promise<QuickInsightsResponse>`
Gets pre-formatted insight cards for dashboards.

```typescript
// Growth insights
const growthCards = await sdk.insights.getQuickInsights('grow', {
  session_id: sessionId,
  date_range: '30_days'
})

// Optimization insights
const optimizeCards = await sdk.insights.getQuickInsights('optimize', {
  session_id: sessionId,
  date_range: '7_days'
})

// Protection insights (risk monitoring)
const protectCards = await sdk.insights.getQuickInsights('protect', {
  session_id: sessionId,
  date_range: '30_days'
})

// Summary overview
const summaryCards = await sdk.insights.getQuickInsights('summary', {
  session_id: sessionId,
  date_range: '30_days'
})

// Use the insights
growthCards.insights.forEach(card => {
  console.log('Title:', card.title)
  console.log('Metric:', card.metric)
  console.log('Value:', card.value)
  console.log('Trend:', card.trend)
  console.log('Recommendation:', card.recommendation)
})
```

#### `getCreativeAnalysis(payload: CreativeAnalysisRequest, options?: SessionOptions): Promise<CreativeAnalysisResponse>`
Analyzes creative performance and provides recommendations.

```typescript
const creativeAnalysis = await sdk.insights.getCreativeAnalysis({
  question: 'Which ad creatives drive the most conversions?',
  category: 'optimize', // 'grow' | 'optimize' | 'fix'
  session_id: sessionId,
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  creative_ids: ['creative_123', 'creative_456'] // Optional
})

console.log('Analysis:', creativeAnalysis.analysis)
console.log('Top Performers:', creativeAnalysis.top_performers)
console.log('Recommendations:', creativeAnalysis.recommendations)
console.log('A/B Test Suggestions:', creativeAnalysis.ab_test_suggestions)
```

### Integrations Service

Manages third-party integrations like Brevo and HubSpot.

#### `saveBrevoCredentials(payload: BrevoCredentialsRequest, options?: SessionOptions): Promise<BrevoResponse>`
Saves Brevo API credentials at the workspace level.

```typescript
const result = await sdk.integrations.saveBrevoCredentials({
  user_id: userId,
  api_key: 'xkeysib-1234567890abcdef'
})

console.log('Brevo credentials saved:', result.success)
console.log('Account info:', result.account_info)
```

#### `connectBrevo(payload: BrevoConnectRequest, options?: SessionOptions): Promise<BrevoResponse>`
Connects Brevo to the current session/account.

```typescript
const connected = await sdk.integrations.connectBrevo({
  session_id: sessionId,
  api_key: 'xkeysib-1234567890abcdef'
})

if (connected.success) {
  console.log('Brevo connected successfully')
  console.log('Lists available:', connected.lists)
}
```

#### `saveBrevoApiKey(payload: BrevoApiKeySaveRequest, options?: SessionOptions): Promise<BrevoResponse>`
Legacy method for saving Brevo API keys.

```typescript
// Legacy method - prefer saveBrevoCredentials
const saved = await sdk.integrations.saveBrevoApiKey({
  session_id: sessionId,
  api_key: 'xkeysib-1234567890abcdef',
  account_id: 'acc_123'
})
```

#### `getHubspotAuthUrl(options?: SessionOptions): Promise<AuthUrlResponse>`
Gets HubSpot OAuth authorization URL.

```typescript
// Start HubSpot OAuth flow
const hubspotAuth = await sdk.integrations.getHubspotAuthUrl()
console.log('HubSpot Auth URL:', hubspotAuth.auth_url)

// Open in new window
window.open(hubspotAuth.auth_url, '_blank')

// With custom session
const hubspotAuthCustom = await sdk.integrations.getHubspotAuthUrl({
  sessionId: 'custom-session'
})
```

## Error Handling

The SDK provides comprehensive error handling through the `ApiError` class.

### Error Structure

```typescript
interface ApiError extends Error {
  status: number          // HTTP status code
  data?: any             // Parsed response body
  request: ApiRequestOptions  // Original request details
  response?: Response    // Raw Response object
}
```

### Common Error Scenarios

```typescript
import { ApiError } from '@/sdk'

try {
  await sdk.accounts.getAvailable()
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        // Session expired or invalid credentials
        await handleLogout()
        break
      case 403:
        // Insufficient permissions
        showPermissionError(error.data?.message)
        break
      case 404:
        // Resource not found
        console.error('Account not found')
        break
      case 429:
        // Rate limited
        const retryAfter = error.response?.headers.get('Retry-After')
        await waitAndRetry(retryAfter)
        break
      case 500:
      case 502:
      case 503:
        // Server errors
        logToSentry(error)
        showServerError()
        break
      default:
        console.error('API Error:', error.message)
    }
  } else {
    // Network or other errors
    console.error('Unexpected error:', error)
  }
}
```

### Global Error Handler

```typescript
// Set up a global error interceptor
const handleApiError = (error: ApiError) => {
  // Log to monitoring service
  console.error(`API Error [${error.status}]:`, error.data)
  
  // Handle authentication errors globally
  if (error.status === 401) {
    window.location.href = '/login'
  }
}

// Wrap SDK calls
const apiCall = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof ApiError) {
      handleApiError(error)
    }
    throw error
  }
}

// Usage
const accounts = await apiCall(() => sdk.accounts.getAvailable())
```

## Testing

### Mocking the SDK

```typescript
import { vi } from 'vitest' // or jest
import { MiaSDK } from '@/sdk'

// Create mock SDK
const createMockSdk = () => {
  const mockFetch = vi.fn()
  
  const sdk = new MiaSDK({
    baseUrl: 'https://api.test.com',
    fetchFn: mockFetch
  })
  
  return { sdk, mockFetch }
}

// Test example
it('should fetch accounts', async () => {
  const { sdk, mockFetch } = createMockSdk()
  
  // Mock response
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      accounts: [{ id: '1', name: 'Test Account' }]
    })
  })
  
  const result = await sdk.accounts.getAvailable()
  
  expect(mockFetch).toHaveBeenCalledWith(
    'https://api.test.com/api/accounts/available',
    expect.objectContaining({
      method: 'GET',
      headers: expect.any(Headers)
    })
  )
  
  expect(result.accounts).toHaveLength(1)
})
```

### Testing with Session Overrides

```typescript
it('should use custom session', async () => {
  const { sdk, mockFetch } = createMockSdk()
  
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ valid: true })
  })
  
  await sdk.session.validate('test-session', {
    sessionId: 'override-session'
  })
  
  const headers = mockFetch.mock.calls[0][1].headers
  expect(headers.get('X-Session-ID')).toBe('override-session')
})
```

### Integration Testing

```typescript
// Create a test harness
class TestHarness {
  sdk: MiaSDK
  responses: Map<string, any> = new Map()
  
  constructor() {
    this.sdk = new MiaSDK({
      baseUrl: 'https://api.test.com',
      fetchFn: this.mockFetch.bind(this)
    })
  }
  
  mockEndpoint(path: string, response: any) {
    this.responses.set(path, response)
  }
  
  async mockFetch(url: string, options: RequestInit) {
    const path = url.replace('https://api.test.com', '')
    const response = this.responses.get(path)
    
    if (!response) {
      return { ok: false, status: 404 }
    }
    
    return {
      ok: true,
      json: async () => response,
      headers: new Headers()
    }
  }
}

// Use in tests
const harness = new TestHarness()
harness.mockEndpoint('/api/accounts/available', {
  accounts: [{ id: '1', name: 'Test' }]
})

const accounts = await harness.sdk.accounts.getAvailable()
```

## Best Practices

### 1. **Singleton Pattern**
Create one SDK instance and share it across your application:

```typescript
// sdk/instance.ts
import { MiaSDK } from '@/sdk'

export const sdk = new MiaSDK({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  defaultSessionId: localStorage.getItem('mia_session_id') ?? undefined
})

// Update session when it changes
export const updateSession = (sessionId: string) => {
  sdk.setSessionId(sessionId)
  localStorage.setItem('mia_session_id', sessionId)
}
```

### 2. **Type Safety**
Always use the exported types:

```typescript
import type { Account, MetaCampaign, ChatResponse } from '@/sdk'

// Component props
interface DashboardProps {
  account: Account
  campaigns: MetaCampaign[]
}

// State management
interface AppState {
  chatHistory: ChatResponse[]
}
```

### 3. **Error Boundaries**
Implement error boundaries for SDK calls:

```typescript
const SDKErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error) => {
        if (error instanceof ApiError) {
          console.error('SDK Error:', error)
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
```

### 4. **Loading States**
Use consistent loading patterns:

```typescript
const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true)
        const response = await sdk.accounts.getAvailable()
        setAccounts(response.accounts)
      } catch (err) {
        setError(err as ApiError)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAccounts()
  }, [])
  
  return { accounts, loading, error }
}
```

### 5. **Environment Configuration**
Use environment variables for configuration:

```typescript
// .env
VITE_API_BASE_URL=https://api.mia.ai
VITE_MIA_API_KEY=your-api-key

// .env.development
VITE_API_BASE_URL=http://localhost:8000
VITE_MIA_API_KEY=dev-api-key

// .env.test
VITE_API_BASE_URL=https://api.test.mia.ai
VITE_MIA_API_KEY=test-api-key
```

## Migration Guide

If you're migrating from direct API calls to the SDK:

1. **Replace fetch calls**:
```typescript
// Before
const response = await fetch(`${API_URL}/api/accounts/available`, {
  headers: { 'X-Session-ID': sessionId }
})
const data = await response.json()

// After
const data = await sdk.accounts.getAvailable()
```

2. **Update error handling**:
```typescript
// Before
if (!response.ok) {
  throw new Error('Failed to fetch accounts')
}

// After
try {
  const data = await sdk.accounts.getAvailable()
} catch (error) {
  if (error instanceof ApiError) {
    // Typed error handling
  }
}
```

3. **Use typed responses**:
```typescript
// Before
const accounts = data.accounts as any[]

// After
import type { AvailableAccountsResponse } from '@/sdk'
const { accounts } = await sdk.accounts.getAvailable()
// accounts is fully typed!
``` 
