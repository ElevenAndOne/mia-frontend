# MIA SDK Documentation

A production-grade TypeScript SDK for the MIA frontend application. This SDK provides a unified interface for all API interactions, including authentication, session management, accounts, workspaces, platform integrations, AI-powered insights, and real-time streaming.

## Table of Contents

- [Quick Start](#quick-start)
- [Client Configuration](#client-configuration)
- [Session Management](#session-management)
- [Authentication](#authentication)
- [Accounts](#accounts)
- [Workspaces](#workspaces)
- [Platforms](#platforms)
- [Insights](#insights)
- [Chat](#chat)
- [Onboarding](#onboarding)
- [Error Handling](#error-handling)
- [React Integration](#react-integration)
- [Streaming](#streaming)

---

## Quick Start

```typescript
import { createMiaClient, isMiaSDKError } from '@/sdk';

// Create the client
const mia = createMiaClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  onSessionExpired: () => window.location.href = '/login',
});

// Restore session on app load
const { success, session } = await mia.session.restore();
if (session?.isAuthenticated) {
  console.log('User:', session.user);
}

// Google OAuth
const result = await mia.auth.google.connect();
if (result.success) {
  const { accounts } = await mia.accounts.list();
}

// Stream insights
for await (const chunk of mia.insights.streamGrow({ dateRange: '30_days' })) {
  if (chunk.type === 'text') fullText += chunk.text;
}
```

---

## Client Configuration

```typescript
interface MiaClientConfig {
  baseUrl: string;              // API base URL (required)
  storage?: StorageBackend;     // Session storage (default: localStorage)
  timeout?: number;             // Request timeout ms (default: 30000)
  retries?: number;             // GET retry count (default: 3)
  retryDelay?: number;          // Retry delay ms (default: 1000)
  onSessionExpired?: () => void; // Global 401 handler
}
```

---

## Session Management

**Namespace:** `mia.session`

| Method | Description |
|--------|-------------|
| `restore()` | Restore or create session. Returns `{ success, session, isNewSession }` |
| `validate()` | Validate current session. Returns `SessionData \| null` |
| `getSessionId()` | Get session ID from storage |
| `getUserId()` | Get user ID from storage |
| `clear()` | Clear session (logout) |
| `selectMcc(mccId)` | Select MCC for Google Ads |
| `syncAccounts()` | Sync accounts with backend |

```typescript
// Restore session on app load
const { success, session, isNewSession } = await mia.session.restore();

if (session?.isAuthenticated) {
  console.log('User:', session.user);
  console.log('Platforms:', session.connectedPlatforms);
}

// SessionData structure
interface SessionData {
  sessionId: string;
  user: User | null;
  isAuthenticated: boolean;
  authenticatedPlatforms: { google: boolean; meta: boolean };
  connectedPlatforms: {
    google: boolean;
    ga4: boolean;
    meta: boolean;
    facebookOrganic: boolean;
    brevo: boolean;
    hubspot: boolean;
    mailchimp: boolean;
  };
  selectedAccount: AccountSummary | null;
  expiresAt: string | null;
}
```

---

## Authentication

### Google OAuth

**Namespace:** `mia.auth.google`

| Method | Description |
|--------|-------------|
| `connect(options?)` | Full OAuth flow (popup/redirect) |
| `getStatus()` | Check auth status |
| `logout()` | Logout from Google |
| `getAdAccounts(userId)` | Get Google Ads accounts |
| `getUserInfo(userId?)` | Get user info |

```typescript
// Connect with Google
try {
  const result = await mia.auth.google.connect({
    onPopupClosed: () => setLoading(false),
    tenantId: 'optional-tenant-id',
  });

  if (result.success) {
    console.log('User:', result.user);
    console.log('Is new user:', result.isNewUser);
  }
} catch (error) {
  if (isMiaSDKError(error) && error.code === 'OAUTH_POPUP_BLOCKED') {
    alert('Please allow popups');
  }
}

// Get Google Ads accounts
const { mccAccounts, regularAccounts } = await mia.auth.google.getAdAccounts(userId);
```

### Meta OAuth

**Namespace:** `mia.auth.meta`

| Method | Description |
|--------|-------------|
| `connect(options?)` | Full OAuth flow (popup only) |
| `getStatus()` | Check auth status |
| `logout()` | Logout from Meta |
| `getAvailableAccounts()` | Get available ad accounts |
| `linkAccount(metaAccountId)` | Link an ad account |
| `getFacebookPages(refresh?)` | Get Facebook pages |
| `linkFacebookPage(pageId, options?)` | Link a Facebook page |

```typescript
// Connect with Meta
const result = await mia.auth.meta.connect();

if (result.success) {
  // Get available accounts
  const accounts = await mia.auth.meta.getAvailableAccounts();

  // Link an account
  await mia.auth.meta.linkAccount(accounts[0].id);
}

// Get and link Facebook pages
const pages = await mia.auth.meta.getFacebookPages();
await mia.auth.meta.linkFacebookPage(pages[0].id, {
  pageName: pages[0].name,
});
```

---

## Accounts

**Namespace:** `mia.accounts`

| Method | Description |
|--------|-------------|
| `list(options?)` | List all accounts. Use `{ refresh: true }` to force refresh |
| `select(accountId, industry?)` | Select account for session |
| `linkPlatform(accountId, platform, platformId)` | Link platform to account |
| `linkGoogleAds(targetAccountId, customerId, loginCustomerId?)` | Link Google Ads |
| `getMccAccounts(userId)` | Get MCC accounts |
| `refreshGA4Properties()` | Refresh GA4 properties |
| `getPlatformPreferences()` | Get platform preferences |
| `savePlatformPreferences(platforms)` | Save platform preferences |

```typescript
// List accounts
const { accounts, ga4Properties } = await mia.accounts.list();

// Select an account
const result = await mia.accounts.select(accountId, 'ecommerce');
if (result.autoCreatedWorkspace) {
  console.log('Workspace created:', result.autoCreatedWorkspace.name);
}

// Link platforms
await mia.accounts.linkPlatform(accountId, 'meta', 'act_123');
await mia.accounts.linkGoogleAds(accountId, '123-456-7890');

// Account structure
interface Account {
  id: string;
  name: string;
  displayName: string;
  googleAdsId: string;
  ga4PropertyId: string;
  metaAdsId?: string;
  facebookPageId?: string;
  brevoApiKey?: string;
  hubspotPortalId?: string;
  mailchimpAccountId?: string;
  businessType: string;
}
```

---

## Workspaces

**Namespace:** `mia.workspaces`

### CRUD Operations

| Method | Description |
|--------|-------------|
| `list()` | List all workspaces |
| `getCurrent()` | Get current workspace |
| `get(tenantId)` | Get workspace by ID |
| `create(name)` | Create workspace |
| `update(tenantId, name)` | Update workspace |
| `delete(tenantId)` | Delete workspace |
| `switch(tenantId)` | Switch workspace |
| `getIntegrations(tenantId)` | Get integrations status |

```typescript
// List and switch workspaces
const workspaces = await mia.workspaces.list();
await mia.workspaces.switch(workspaces[0].tenantId);

// Create workspace
const workspace = await mia.workspaces.create('My Workspace');

// Workspace structure
interface Workspace {
  tenantId: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
  onboardingCompleted: boolean;
  connectedPlatforms: string[];
  memberCount: number;
}
```

### Members

| Method | Description |
|--------|-------------|
| `getMembers(tenantId)` | List members |
| `removeMember(tenantId, userId)` | Remove member |
| `updateMemberRole(tenantId, userId, role)` | Update role |

```typescript
const members = await mia.workspaces.getMembers(tenantId);
await mia.workspaces.updateMemberRole(tenantId, userId, 'admin');
```

### Invites

| Method | Description |
|--------|-------------|
| `getInvites(tenantId)` | List invites |
| `createInvite(tenantId, role, email?)` | Create invite |
| `revokeInvite(tenantId, inviteId)` | Revoke invite |
| `getInviteDetails(inviteId)` | Get invite details (public) |
| `acceptInvite(inviteId)` | Accept invite |
| `getPendingInvites()` | Get pending invites for user |

```typescript
// Create email invite
const invite = await mia.workspaces.createInvite(tenantId, 'member', 'user@example.com');

// Create link invite (no email)
const linkInvite = await mia.workspaces.createInvite(tenantId, 'member');

// Accept invite
const { tenantId } = await mia.workspaces.acceptInvite(inviteId);
```

---

## Platforms

**Namespace:** `mia.platforms`

### General Methods

| Method | Description |
|--------|-------------|
| `disconnect(platformId)` | Disconnect platform |
| `refresh(platformId)` | Refresh platform data |
| `getStatus(platformId)` | Get platform status |
| `getAllStatuses()` | Get all platform statuses |

```typescript
await mia.platforms.disconnect('meta');
const statuses = await mia.platforms.getAllStatuses();
```

### Brevo (`mia.platforms.brevo`)

| Method | Description |
|--------|-------------|
| `connect(apiKey)` | Connect with API key |
| `disconnect(brevoId?)` | Disconnect |
| `getStatus()` | Get status |
| `getAccounts()` | Get accounts |
| `selectAccount(brevoAccountId)` | Select primary account |

```typescript
await mia.platforms.brevo.connect('xkeysib-...');
const { connected, accountName } = await mia.platforms.brevo.getStatus();
```

### HubSpot (`mia.platforms.hubspot`)

| Method | Description |
|--------|-------------|
| `getAuthUrl(tenantId)` | Get OAuth URL |
| `disconnect(hubspotId?)` | Disconnect |
| `getStatus()` | Get status |
| `getAccounts()` | Get accounts |
| `selectAccount(hubspotId)` | Select primary |

```typescript
const { authUrl } = await mia.platforms.hubspot.getAuthUrl(tenantId);
window.open(authUrl, '_blank');
```

### Mailchimp (`mia.platforms.mailchimp`)

| Method | Description |
|--------|-------------|
| `getAuthUrl(tenantId)` | Get OAuth URL |
| `disconnect(mailchimpId?)` | Disconnect |
| `getStatus()` | Get status |
| `getAccounts()` | Get accounts |
| `setPrimary(mailchimpId)` | Set primary |

---

## Insights

**Namespace:** `mia.insights`

### Non-Streaming

| Method | Description |
|--------|-------------|
| `generate(type, options?)` | Generate insights |
| `getSummary(dateRange?)` | Get summary |

```typescript
const response = await mia.insights.generate('grow', {
  dateRange: '30_days',
  platforms: ['google_ads', 'meta'],
});
```

### Streaming

| Method | Description |
|--------|-------------|
| `streamGrow(options?)` | Stream Grow insights |
| `streamOptimize(options?)` | Stream Optimize insights |
| `streamProtect(options?)` | Stream Protect insights |
| `streamWithAbort(type, options?)` | Stream with abort capability |
| `streamSnapshot(options?)` | Stream intelligence snapshot |
| `streamOnboardingGrow(platforms?)` | Stream onboarding grow |

```typescript
// Basic streaming
let fullText = '';
for await (const chunk of mia.insights.streamGrow({ dateRange: '30_days' })) {
  if (chunk.type === 'text') {
    fullText += chunk.text;
    updateUI(fullText);
  } else if (chunk.type === 'done') {
    console.log('Complete!');
  } else if (chunk.type === 'error') {
    console.error(chunk.error);
  }
}

// Abortable streaming
const { stream, abort } = mia.insights.streamWithAbort('grow');

// Start consuming
(async () => {
  for await (const chunk of stream) {
    // Handle chunks
  }
})();

// Abort when needed
abort();
```

### Async Tasks

| Method | Description |
|--------|-------------|
| `startAsync(type)` | Start async generation |
| `getTaskStatus(taskId)` | Poll task status |
| `cancelTask(taskId)` | Cancel task |

```typescript
const { taskId } = await mia.insights.startAsync('grow');

// Poll for completion
const status = await mia.insights.getTaskStatus(taskId);
// status.status: 'pending' | 'running' | 'completed' | 'failed'
```

### Bronze Tier (Instant Facts)

| Method | Description |
|--------|-------------|
| `getBronzeHighlight(type, dateRange?)` | Get instant fact (<1s) |
| `getBronzeFollowup(factId)` | Follow up with AI |
| `getPrefetchStatus()` | Check prefetch status |

```typescript
const highlight = await mia.insights.getBronzeHighlight('grow', '30_days');
console.log(highlight.headline, highlight.detail);
```

---

## Chat

**Namespace:** `mia.chat`

| Method | Description |
|--------|-------------|
| `send(message)` | Send chat message |
| `quickQuestion(question, context?)` | Simple question (throws on error) |

```typescript
// Full chat message
const response = await mia.chat.send({
  message: 'How did my campaigns perform?',
  dateRange: '7_days',
  platforms: ['google_ads', 'meta'],
  googleAdsId: '123-456-7890',
});

if (response.success) {
  console.log(response.claudeResponse);
}

// Quick question
const answer = await mia.chat.quickQuestion(
  'What was my best campaign?',
  { dateRange: '30_days' }
);
```

---

## Onboarding

**Namespace:** `mia.onboarding`

| Method | Description |
|--------|-------------|
| `getStatus()` | Get onboarding status |
| `advanceStep()` | Advance to next step |
| `updateStep(step)` | Set specific step |
| `complete(platforms?)` | Mark complete |
| `skip()` | Skip onboarding |
| `getAvailablePlatforms()` | Get available platforms |
| `getBronzeHighlight(platform?)` | Get bronze fact |
| `getBronzeFollowup(platform?)` | Get followup |
| `startGrowInsightsAsync()` | Start async grow |
| `checkGrowInsightsStatus(taskId)` | Check grow status |

```typescript
const status = await mia.onboarding.getStatus();

// Onboarding steps
const ONBOARDING_STEPS = {
  NOT_STARTED: 0,
  FIRST_PLATFORM_CONNECTED: 1,
  BRONZE_FACT_SHOWN: 2,
  ASKED_SECOND_PLATFORM: 3,
  SECOND_PLATFORM_CONNECTED: 4,
  COMPLETED: 5,
};

if (!status.completed) {
  await mia.onboarding.advanceStep();
}
```

---

## Error Handling

### Error Codes

```typescript
const ErrorCodes = {
  // Session
  NO_SESSION: 'NO_SESSION',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // HTTP
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',

  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // OAuth
  OAUTH_POPUP_BLOCKED: 'OAUTH_POPUP_BLOCKED',
  OAUTH_CANCELLED: 'OAUTH_CANCELLED',
  OAUTH_FAILED: 'OAUTH_FAILED',

  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};
```

### Error Interface

```typescript
interface MiaSDKError extends Error {
  name: 'MiaSDKError';
  code: ErrorCode;
  status?: number;
  endpoint?: string;
  context?: Record<string, unknown>;
}
```

### Usage

```typescript
import { isMiaSDKError, ErrorCodes } from '@/sdk';

try {
  await mia.accounts.select(accountId);
} catch (error) {
  if (isMiaSDKError(error)) {
    switch (error.code) {
      case ErrorCodes.SESSION_EXPIRED:
        redirectToLogin();
        break;
      case ErrorCodes.RATE_LIMITED:
        showRetryLater();
        break;
      default:
        toast.error(error.message);
    }
  }
}
```

---

## React Integration

### MiaProvider

```tsx
import { MiaProvider } from '@/sdk/react';

function App() {
  return (
    <MiaProvider
      config={{
        baseUrl: import.meta.env.VITE_API_BASE_URL,
        onSessionExpired: () => navigate('/login'),
      }}
    >
      <YourApp />
    </MiaProvider>
  );
}
```

### useMiaClient Hook

```tsx
import { useMiaClient, isMiaSDKError } from '@/sdk';

function MyComponent() {
  const mia = useMiaClient();

  const handleConnect = async () => {
    try {
      const result = await mia.auth.google.connect();
      if (result.success) {
        // Handle success
      }
    } catch (error) {
      if (isMiaSDKError(error)) {
        toast.error(error.message);
      }
    }
  };

  return <button onClick={handleConnect}>Connect</button>;
}
```

---

## Streaming

### SSEChunk Type

```typescript
interface SSEChunk {
  type: 'text' | 'done' | 'error';
  text?: string;   // When type === 'text'
  error?: string;  // When type === 'error'
}
```

### Streaming Pattern

```typescript
async function streamInsights() {
  let fullText = '';

  try {
    for await (const chunk of mia.insights.streamGrow()) {
      switch (chunk.type) {
        case 'text':
          fullText += chunk.text;
          setContent(fullText);
          break;
        case 'done':
          setIsComplete(true);
          break;
        case 'error':
          setError(chunk.error);
          break;
      }
    }
  } catch (error) {
    if (isMiaSDKError(error)) {
      setError(error.message);
    }
  }
}
```

### Cleanup on Unmount

```typescript
function useAbortableStream() {
  const abortRef = useRef<(() => void) | null>(null);

  const startStream = async () => {
    const { stream, abort } = mia.insights.streamWithAbort('grow');
    abortRef.current = abort;

    for await (const chunk of stream) {
      // Handle chunks
    }
  };

  useEffect(() => {
    return () => abortRef.current?.();
  }, []);

  return { startStream, stopStream: () => abortRef.current?.() };
}
```

---

## Type Exports

All types are exported from `@/sdk`:

```typescript
import type {
  // Client
  MiaClient, MiaClientConfig,

  // Session
  User, SessionData, AccountSummary, RestoreSessionResult,

  // Accounts
  Account, MccAccount, GoogleAdsAccount, MetaAdAccount, GA4Property,

  // Workspaces
  Workspace, WorkspaceMember, WorkspaceInvite, WorkspaceRole,

  // Platforms
  PlatformId, PlatformStatus, BrevoAccount, HubSpotAccount, MailchimpAccount,

  // Auth
  GoogleConnectResult, MetaConnectResult,

  // Onboarding
  OnboardingStatus, OnboardingStep, BronzeFact,

  // Streaming
  SSEChunk,

  // Errors
  MiaSDKError, ErrorCode,
} from '@/sdk';
```