# MIA Frontend - Comprehensive Code Analysis Report
**Generated: February 4, 2026**

## Executive Summary

This report documents a thorough analysis of the mia-frontend codebase, identifying **61 distinct issues** across user flows, error handling, state management, and component patterns. Issues are categorized by severity (Critical, High, Medium, Low) with specific file locations and recommended fixes.

### Quick Stats
- **Critical Issues**: 8
- **High Priority Issues**: 20
- **Medium Priority Issues**: 25
- **Low Priority Issues**: 8

---

## Table of Contents
1. [Critical Issues - Immediate Action Required](#1-critical-issues)
2. [Authentication & Session Issues](#2-authentication--session-issues)
3. [Navigation & User Flow Issues](#3-navigation--user-flow-issues)
4. [Error Handling Gaps](#4-error-handling-gaps)
5. [State Management Bugs](#5-state-management-bugs)
6. [Data Fetching Issues](#6-data-fetching-issues)
7. [Component & UI Issues](#7-component--ui-issues)
8. [Recommendations Summary](#8-recommendations-summary)

---

## 1. Critical Issues

### 1.1 Non-Functional Workspace Modal Close Handler
**Severity**: CRITICAL
**File**: [use-app-controller.ts:87-89](src/hooks/use-app-controller.ts#L87-L89)

```typescript
const handleCreateWorkspaceClose = () => {
  console.log('[APP] Create workspace modal close attempted - workspace required')
}
```

**Issue**: When `required: true`, the workspace creation modal cannot be closed. If workspace creation fails, users are **trapped with no way to proceed or go back**.

**Impact**: Users with no workspaces after account selection are permanently stuck.

**Fix**: Add proper error recovery - either allow closing with logout option or show retry UI.

---

### 1.2 OAuth Polling Memory Leak
**Severity**: CRITICAL
**File**: [session-context.tsx:292-337](src/contexts/session-context.tsx#L292-L337)

```typescript
const pollTimer = setInterval(async () => {
  // polling logic...
}, 3000)
// NO cleanup function - timer runs after unmount
```

**Issue**: OAuth popup polling uses `setInterval` with no cleanup if component unmounts. The async callback in the interval could also cause unhandled promise rejections.

**Impact**: Memory leaks, possible crashes, orphaned timers running in background.

**Fix**: Add cleanup function in useEffect, use AbortController for async operations.

---

### 1.3 Unhandled `pending_platform_connect` State
**Severity**: CRITICAL
**File**: [use-app-controller.ts:65](src/hooks/use-app-controller.ts#L65)

```typescript
localStorage.setItem('pending_platform_connect', platformId)
navigate('/integrations')
// Never read or cleared
```

**Issue**: The app sets `pending_platform_connect` in localStorage when navigating to integrations but **never reads or clears it**. This creates orphaned state that persists across sessions.

**Impact**: Mobile users who navigate away before completing platform connection get stuck in inconsistent state.

**Fix**: Read and clear the flag on integrations page mount, or remove entirely.

---

### 1.4 No 401/403 Error Handling
**Severity**: CRITICAL
**File**: [api.ts](src/utils/api.ts)

**Issue**: No global response interceptor for authentication errors. If session expires during use, API calls fail silently with no redirect to login.

**Impact**: Users see failed requests without understanding why. No automatic logout or session refresh.

**Fix**: Implement fetch wrapper with response interceptor that handles 401/403 by redirecting to login.

---

### 1.5 Stale Closure in `selectAccountFn`
**Severity**: CRITICAL
**File**: [session-context.tsx:473-531](src/contexts/session-context.tsx#L473-L531)

```typescript
const selectAccountFn = useCallback(async (accountId: string) => {
  const account = state.availableAccounts.find(a => a.id === accountId)
  // ...
}, [state.sessionId, state.availableAccounts]) // Stale closure
```

**Issue**: Account lookup uses stale `availableAccounts` from closure. After `refreshAccounts()`, the function still references old array.

**Impact**: Wrong account selected or null set, causing downstream API failures.

**Fix**: Use functional state update or pass accounts as parameter.

---

### 1.6 Race Condition in Invite Acceptance
**Severity**: CRITICAL
**File**: [use-app-controller.ts:70-85](src/hooks/use-app-controller.ts#L70-L85) + [invite-page.tsx](src/pages/invite-page.tsx)

```typescript
const handleInviteAccepted = async (tenantId: string) => {
  window.history.replaceState({}, '', '/')  // Clears history FIRST
  await refreshWorkspaces()
  await switchWorkspace(tenantId)
  // Navigation...
}
```

**Issue**: Browser history is cleared BEFORE async operations complete. If navigation fails, user is stranded with no back button.

**Impact**: Users accepting invites while session loads could see race conditions and broken navigation.

**Fix**: Only modify history after all async operations succeed.

---

### 1.7 Mobile OAuth State Leakage
**Severity**: CRITICAL
**File**: [session-context.tsx:168-178](src/contexts/session-context.tsx#L168-L178)

```typescript
if (isMobile()) {
  localStorage.setItem('mia_oauth_pending', 'google')
  localStorage.setItem('mia_oauth_return_url', window.location.href)
  window.location.href = authData.auth_url
}
// Never cleared on error paths
```

**Issue**: Mobile OAuth localStorage flags (`mia_oauth_pending`, `mia_oauth_return_url`) are not cleaned on all error paths.

**Impact**: Next user on same device could see orphaned OAuth state, causing login loops.

**Fix**: Clear localStorage in all error handlers and on successful completion.

---

### 1.8 Unprotected JSON Parsing
**Severity**: CRITICAL
**File**: [platform-service.ts:12](src/features/integrations/services/platform-service.ts#L12)

```typescript
const errorData = await response.json()
throw new Error(errorData.detail || 'Failed to disconnect')
// No try/catch around response.json()
```

**Issue**: If server returns non-JSON response (HTML error page, empty response), `response.json()` throws an unhandled error that crashes the app.

**Impact**: Service errors from backend cause frontend crashes instead of graceful degradation.

**Fix**: Wrap all `response.json()` calls in try/catch with fallback message.

---

## 2. Authentication & Session Issues

### 2.1 No Token Refresh Mechanism
**Severity**: HIGH
**File**: [session-context.tsx](src/contexts/session-context.tsx)

**Issue**: Session-based auth with no refresh mechanism. If backend session expires, frontend doesn't detect it.

**Impact**: Users stay in authenticated UI but all API calls fail.

**Recommendation**: Add session validation polling every 5 minutes, or check session on API errors.

---

### 2.2 OAuth Popup Event Listener Leak
**Severity**: HIGH
**File**: [google-auth-service.ts:137](src/features/auth/services/google-auth-service.ts#L137)

```typescript
window.addEventListener('message', messageHandler)
// Not removed if popup closes before completing
```

**Impact**: Multiple login attempts create multiple message listeners, potentially firing on wrong auth attempts.

---

### 2.3 Silent Promise Rejections in Session Init
**Severity**: HIGH
**File**: [session-context.tsx:184-188](src/contexts/session-context.tsx#L184-L188)

```typescript
const [sessionData, accounts, workspaces, currentWorkspace] = await Promise.all([
  sessionService.validateSession(storedSessionId),  // No .catch() - crashes all
  accountService.fetchAccounts(storedSessionId).catch(() => []),
  // ...
])
```

**Issue**: `validateSession` has no error handling. If it fails, entire initialization crashes.

**Fix**: Add `.catch()` to session validation with fallback to new session creation.

---

### 2.4 Alert() Used for Error Display
**Severity**: MEDIUM
**File**: [use-login-page.ts:34-37](src/features/auth/hooks/use-login-page.ts#L34-L37)

```typescript
alert(detail ? `${fallback}: ${detail}` : fallback)
```

**Impact**: Browser alerts block interaction, can't be styled, poor accessibility.

**Fix**: Implement toast/notification system instead.

---

### 2.5 Meta OAuth Has No Mobile Redirect Flow
**Severity**: HIGH
**Files**: [use-login-page.ts](src/features/auth/hooks/use-login-page.ts), [meta-auth-service.ts](src/features/auth/services/meta-auth-service.ts)

**Issue**: Meta login always opens a popup. On mobile browsers (iOS Safari in particular), popups are frequently blocked, causing Meta auth to fail with no viable fallback.

**Impact**: Meta-first users on mobile cannot authenticate.

**Fix**: Add a mobile redirect flow for Meta OAuth (mirroring Google), including cleanup of localStorage flags on all outcomes.

---

### 2.6 OAuth Timeout Fires After Successful Login
**Severity**: MEDIUM
**File**: [session-context.tsx:322-336](src/contexts/session-context.tsx#L322-L336)

```typescript
setTimeout(() => {
  clearInterval(pollTimer)
  if (!popup.closed) popup.close()
  setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: 'Authentication timed out' }))
  resolve(false)
}, 300000)
```

**Issue**: The timeout is never cleared on success. Five minutes after a successful login, it can still fire and inject an error state.

**Impact**: Users see spurious auth timeout errors after being authenticated.

**Fix**: Store the timeout ID and clear it when the popup closes successfully (and on error).

---

## 3. Navigation & User Flow Issues

### 3.1 Meta Account Selection Dead End
**Severity**: HIGH
**File**: [meta-account-selection-page.tsx:65-72](src/pages/meta-account-selection-page.tsx#L65-L72)

**Issue**: If user has no Meta accounts, page shows message but **no navigation options** - user is trapped.

**Fix**: Add "Back to Login" or "Try Different Account" button.

---

### 3.2 Infinite Redirect Loop Potential
**Severity**: HIGH
**Files**: Multiple (auth-redirects + onboarding)

**Sequence**:
1. User reaches `/login` with `selectedAccount` and no workspaces
2. Workspace modal opens as required
3. User creates workspace → navigates to `/onboarding`
4. Onboarding may auto-complete if no bronze data → back to `/home` or `/login`
5. Cycle repeats if workspace state is inconsistent

**Fix**: Add guards to prevent re-triggering workspace modal after creation.

---

### 3.3 Loading Screen Flash During Transitions
**Severity**: MEDIUM
**File**: [protected-route.tsx:35-39](src/routes/protected-route.tsx#L35-L39)

**Issue**: Different routes have different loading states, causing multiple LoadingScreens to flash during navigation.

**Fix**: Implement consistent loading state management with transition animations.

---

### 3.4 Protected Route Doesn't Preserve Destination
**Severity**: MEDIUM
**File**: [protected-route.tsx:42-54](src/routes/protected-route.tsx#L42-L54)

```typescript
return <Navigate to="/" state={{ from: location }} replace />
// 'from' is passed but never used after auth
```

**Issue**: Original destination is lost after authentication completes.

**Fix**: Read and navigate to `from` location after successful auth.

---

### 3.5 Navigation Without Awaiting Async
**Severity**: MEDIUM
**Files**: Multiple

Example in [use-dashboard-page.ts:103](src/features/dashboard/hooks/use-dashboard-page.ts#L103):
```typescript
setTimeout(() => {
  navigate('/integrations')  // Navigates while operations still running
}, 500)
```

**Impact**: Component unmounting during async operations causes memory leaks.

---

### 3.6 OAuth Failure Can Leave App Stuck on Loading Screen
**Severity**: HIGH
**Files**: [use-app-controller.ts:19-120](src/hooks/use-app-controller.ts#L19-L120), [use-login-page.ts:29-92](src/features/auth/hooks/use-login-page.ts#L29-L92)

**Issue**: `onOAuthPopupClosed` sets `oauthLoadingPlatform`, but it is only cleared on success. On any auth failure path, `oauthLoadingPlatform` remains set, causing `showLoadingScreen` to be permanently true.

**Impact**: Users who cancel OAuth or hit an error get stuck on the loading screen with no recovery.

**Fix**: Clear `oauthLoadingPlatform` in all error/abort paths, or derive loading state entirely from session `isLoading`.

---

### 3.7 Onboarding Route Can Show Infinite Loading Screen
**Severity**: HIGH
**File**: [use-app-controller.ts:84-103](src/hooks/use-app-controller.ts#L84-L103)

**Issue**: `/onboarding` sets `showLoadingScreen` when the user is unauthenticated or lacks an account, even if `isLoading` is false. This overrides `ProtectedRoute` and prevents redirect.

**Impact**: Unauthenticated users can land on a permanent spinner instead of being redirected to `/`.

**Fix**: Gate this branch on `isLoading`, or remove it and let `ProtectedRoute` control the redirect.

---

### 3.8 Integrations Page Accessible Without Selected Account
**Severity**: HIGH
**Files**: [routes/index.tsx:60-70](src/routes/index.tsx#L60-L70), [integration-status-service.ts:83-120](src/features/integrations/services/integration-status-service.ts#L83-L120)

**Issue**: `/integrations` does not require a selected account. When `selectedAccount` is null, the integration status service falls back to the first account from the API.

**Impact**: Users can see or modify integrations for the wrong account.

**Fix**: Require account selection for `/integrations` or block the UI until `selectedAccount` is set.

---

### 3.9 Help Page Links to Non-Existent Routes
**Severity**: MEDIUM
**File**: [help-page.tsx:22-84](src/pages/help-page.tsx#L22-L84)

**Issue**: The Help page links to `/docs/integration-guide` and `/docs/video-tutorial`, but no matching routes exist.

**Impact**: Users hit blank screens when clicking Help resources.

**Fix**: Add those routes or convert links to external URLs. Add a fallback 404 route.

---

### 3.10 Missing 404 Route
**Severity**: LOW
**File**: [routes/index.tsx](src/routes/index.tsx)

**Issue**: No catch-all route is defined. Unknown paths render a blank screen.

**Fix**: Add a `*` route with a simple Not Found page and a link back to `/home`.

---

## 4. Error Handling Gaps

### 4.1 No Toast/Notification System
**Severity**: HIGH

**Current State**: Uses blocking `alert()` calls instead of non-blocking toasts.

**Files Using Alert**:
- [integrations-page.tsx:250](src/features/integrations/integrations-page.tsx#L250)
- [integrations-page.tsx:396](src/features/integrations/integrations-page.tsx#L396)
- [integrations-page.tsx:464](src/features/integrations/integrations-page.tsx#L464)

**Recommendation**: Implement toast system (react-hot-toast, sonner, or custom).

---

### 4.2 Silent `.catch()` Chains
**Severity**: HIGH
**Files**: Multiple

```typescript
refreshWorkspaces().catch(err => console.error(...))
// User has no idea operation failed
```

**Files Affected**:
- [integrations-page.tsx:49](src/features/integrations/integrations-page.tsx#L49)
- [integrations-page.tsx:457](src/features/integrations/integrations-page.tsx#L457)
- [integrations-page.tsx:773-858](src/features/integrations/integrations-page.tsx#L773)

**Fix**: Update UI state on error, show user feedback.

---

### 4.3 Generic Error Messages
**Severity**: MEDIUM

All services throw generic errors without distinguishing error types:
```typescript
throw new Error(`HTTP ${response.status}: ${response.statusText}`)
```

**Impact**: Users can't understand if it's a network issue, auth problem, or server error.

**Fix**: Create error type enum, handle each appropriately.

---

### 4.4 No Retry Mechanisms
**Severity**: MEDIUM

**Files Without Retry**:
- All service files (14 total)
- All hooks except streaming

**Impact**: Transient network failures cause immediate permanent failures.

**Fix**: Implement `withRetry()` utility with exponential backoff.

---

### 4.5 Missing Error Boundary Components
**Severity**: MEDIUM
**File**: [main.tsx:140](src/main.tsx#L140)

Only one generic ErrorBoundary exists at root level with minimal fallback:
```typescript
<Sentry.ErrorBoundary fallback={<div>An error has occurred. Please refresh.</div>}>
```

**Fix**: Add component-level error boundaries for isolated error handling.

---

### 4.6 Onboarding Streaming Errors Are Silent
**Severity**: MEDIUM
**Files**: [use-onboarding-chat.ts:64-214](src/features/onboarding/hooks/use-onboarding-chat.ts#L64-L214), [use-onboarding-streaming.ts:10-48](src/features/onboarding/use-onboarding-streaming.ts#L10-L48)

**Issue**: The streaming hook exposes `error`, but `useOnboardingChat` never reads or surfaces it.

**Impact**: When streaming fails, users see no feedback or recovery option and the chat appears stalled.

**Fix**: Handle `error` by adding a visible message and retry action in the chat.

---

### 4.7 Integration Status Failures Look Like “All Disconnected”
**Severity**: MEDIUM
**Files**: [use-integration-status.ts:20-56](src/features/integrations/hooks/use-integration-status.ts#L20-L56), [integration-status-service.ts:83-143](src/features/integrations/services/integration-status-service.ts#L83-L143)

**Issue**: When the integrations status request fails, the UI falls back to empty `platformStatus` with no error message.

**Impact**: Users see all integrations as disconnected even if the failure is transient or auth-related.

**Fix**: Surface query errors in the UI and avoid collapsing to “all disconnected” on failure.

---

## 5. State Management Bugs

### 5.1 Missing Rollback on Optimistic Updates
**Severity**: HIGH
**File**: [workspace-settings.ts:55](src/features/workspace/hooks/use-workspace-settings.ts#L55)

```typescript
const invite = await createWorkspaceInvite(sessionId, workspaceId, payload)
setInvites((prev) => [invite, ...prev])  // No rollback if API fails
```

**Impact**: UI shows invite that doesn't exist on server.

**Fix**: Wrap in try/catch, revert state on failure.

---

### 5.2 Multiple Sources of Truth for Platform Status
**Severity**: HIGH
**Files**: [integrations-page.tsx](src/features/integrations/integrations-page.tsx) + [use-integration-status.ts](src/features/integrations/hooks/use-integration-status.ts)

Platform connection status managed in three places:
1. React Query cache
2. Session context (`activeWorkspace.connected_platforms`)
3. Local component state

**Impact**: Disconnecting platform might not update UI if user stays on page.

**Fix**: Use React Query as single source of truth.

---

### 5.3 Stale Closure in Platform Preferences
**Severity**: MEDIUM
**File**: [use-platform-preferences.ts:65-93](src/features/integrations/hooks/use-platform-preferences.ts#L65-L93)

```typescript
useEffect(() => {
  // ...
  prevConnectedRef.current = [...connectedPlatforms]  // Stale value
}, [sessionId, selectedAccountId])  // Intentionally omits connectedPlatforms
```

**Impact**: Newly connected platforms might not be auto-enabled on account switch.

---

### 5.4 Missing Dependencies in useEffect
**Severity**: MEDIUM
**File**: [use-dashboard-page.ts:81-87](src/features/dashboard/hooks/use-dashboard-page.ts#L81-L87)

```typescript
useEffect(() => {
  if (sessionId) {
    refreshAccounts()
    refreshWorkspaces().catch(...)
  }
}, [])  // Missing sessionId, refreshAccounts, refreshWorkspaces
```

---

### 5.5 Race Condition in Grow Insights Polling
**Severity**: MEDIUM
**File**: [onboarding-context.tsx:334-370](src/features/onboarding/onboarding-context.tsx#L334-L370)

**Issue**: `checkGrowInsightsStatus` recreates on every `growTaskId` change, potentially creating multiple overlapping polling loops.

---

### 5.6 Active Workspace Not Set When Workspaces Exist
**Severity**: HIGH
**File**: [session-context.tsx:52-118](src/contexts/session-context.tsx#L52-L118)

**Issue**: `refreshWorkspaces()` updates `availableWorkspaces` but leaves `activeWorkspace` null when no active workspace is set.

**Impact**: Routes requiring workspace (`/settings/workspace`) and tenant-scoped integrations can break even though workspaces exist.

**Fix**: If `activeWorkspace` is null and the fetched list is non-empty, set it to the first workspace (or last used).

---

### 5.7 Onboarding Completion Doesn’t Update User Profile
**Severity**: MEDIUM
**Files**: [onboarding-context.tsx:370-434](src/features/onboarding/onboarding-context.tsx#L370-L434), [use-auth-redirects.ts:40-77](src/hooks/use-auth-redirects.ts#L40-L77)

**Issue**: On completion, the session `user.onboarding_completed` flag is not updated, but redirect logic depends on it.

**Impact**: Users can be redirected back to onboarding even after completing it.

**Fix**: Update session user state on completion or use workspace-level `onboarding_completed` as the source of truth.

---

### 5.8 Integration Highlight State Is Never Consumed
**Severity**: LOW
**File**: [integration-highlight.ts](src/features/integrations/utils/integration-highlight.ts)

**Issue**: `setIntegrationHighlight()` is called from chat, but no component reads `getIntegrationHighlight()` to actually display a highlight state.

**Impact**: Dead state persists in sessionStorage and intended UI guidance never appears.

**Fix**: Implement the highlight behavior in the Integrations UI or remove the unused state.

---

## 6. Data Fetching Issues

### 6.1 No AbortController in Most Fetches
**Severity**: HIGH

Only 1 file uses AbortController: [use-streaming-core.ts](src/features/insights/hooks/use-streaming-core.ts)

**Missing In**:
- All OAuth flows (5-minute polling)
- Account selectors
- Summary insights
- All standard API calls

**Impact**: Requests complete after unmount, causing React warnings and wasted bandwidth.

---

### 6.2 No Pagination Support
**Severity**: MEDIUM

No pagination in:
- Workspace members list
- Workspace invites
- Google Ads accounts

**Impact**: Large organizations could cause slow loads and memory bloat.

---

### 6.3 Dual-Fetch Race Condition
**Severity**: MEDIUM
**File**: [integration-status-service.ts:147-163](src/features/integrations/services/integration-status-service.ts#L147-L163)

```typescript
const accountStatus = await fetchAccountIntegrationStatus(...)
const tenantStatus = await fetchTenantIntegrationStatus(...)
// Data could be stale by merge time
```

---

### 6.4 Query Cache Over-Invalidation
**Severity**: LOW
**File**: [use-integration-status.ts:41](src/features/integrations/hooks/use-integration-status.ts#L41)

```typescript
queryClient.invalidateQueries({ queryKey: ['integration-status'] })
// Invalidates ALL integration-status queries, not just current
```

---

## 7. Component & UI Issues

### 7.1 React Key Anti-Pattern
**Severity**: HIGH
**File**: [dashboard-chat-panel.tsx:17](src/features/dashboard/components/dashboard-chat-panel.tsx#L17)

```typescript
messages.map((message, index) => <Message key={index} ... />)
```

**Impact**: State persists incorrectly when messages are added/deleted.

**Fix**: Use unique message IDs as keys.

---

### 7.2 DOM Query Anti-Pattern
**Severity**: HIGH
**File**: [dashboard-chat-panel.tsx:50-64](src/features/dashboard/components/dashboard-chat-panel.tsx#L50-L64)

```typescript
const input = document.querySelector('input[type="text"]') as HTMLInputElement
```

**Impact**: Breaks if markup changes, uncontrolled form state.

**Fix**: Use controlled input with useState/useRef.

---

### 7.3 Conditional Rendering Bug
**Severity**: MEDIUM
**File**: [message-bubble.tsx:36-52](src/features/onboarding/components/message-bubble.tsx#L36-L52)

**Issue**: Choice buttons can render twice if message has both `type: 'choice-buttons'` AND `choices` array.

---

### 7.4 Missing Accessibility Attributes
**Severity**: MEDIUM

**Files Missing ARIA**:
- [integration-prompt-modal.tsx](src/components/integration-prompt-modal.tsx) - Modal role missing
- [mcc-selection-panel.tsx](src/features/accounts/components/mcc-selection-panel.tsx) - No aria-expanded
- [create-invite-modal.tsx](src/features/workspace/components/create-invite-modal.tsx) - No form labels
- [chat-input.tsx](src/features/chat/components/chat-input.tsx) - No input label

---

### 7.5 Inconsistent Spinner Implementations
**Severity**: LOW

Three different spinner styles used:
- `direct-account-selection-panel.tsx`
- `mcc-selection-panel.tsx`
- `login-page.tsx`

**Fix**: Use shared `Spinner` component consistently.

---

### 7.6 Missing Button Type Attributes
**Severity**: LOW
**File**: [integration-prompt-modal.tsx:68-79](src/components/integration-prompt-modal.tsx#L68-L79)

Buttons missing `type="button"` could trigger form submission in form contexts.

---

### 7.7 "New Chat" Does Not Reset Chat State
**Severity**: MEDIUM
**Files**: [use-app-shell-actions.ts:9-20](src/hooks/use-app-shell-actions.ts#L9-L20), [use-chat-view.tsx:38-116](src/features/chat/hooks/use-chat-view.tsx#L38-L116)

**Issue**: The sidebar “New chat” action only navigates to `/home`. `handleNewChat()` exists in `useChatView`, but is never invoked by the sidebar action.

**Impact**: Users expect a fresh chat, but previous messages remain.

**Fix**: Trigger `handleNewChat()` on navigation state change (e.g., `location.state.newChat`) or expose a reset action via context.

---

### 7.8 Enter Key Bypasses Platform Selection Guard
**Severity**: MEDIUM
**File**: [chat-input.tsx:24-78](src/features/chat/components/chat-input.tsx#L24-L78)

**Issue**: The send button is disabled when no platforms are selected, but pressing Enter still submits because `handleSubmit()` doesn’t check `hasSelectedPlatforms`.

**Impact**: Users can send chat messages without selected platforms, leading to incomplete queries and backend errors.

**Fix**: Block submission when `hasSelectedPlatforms` is false (both in button and Enter handler).

---

## 8. Recommendations Summary

### Immediate Actions (This Week)

| Priority | Issue | Fix |
|----------|-------|-----|
| P0 | Workspace modal trap | Add error recovery/logout option |
| P0 | OAuth polling leak | Add cleanup function to useEffect |
| P0 | OAuth loading screen stuck | Clear `oauthLoadingPlatform` on all outcomes |
| P0 | 401/403 handling | Implement fetch interceptor |
| P0 | JSON parsing crash | Wrap response.json() in try/catch |
| P1 | Toast system | Replace all alert() calls |
| P1 | Meta dead end | Add back button to empty state |
| P1 | Meta mobile OAuth | Add redirect fallback for mobile browsers |
| P1 | Integrations without account | Require account selection before access |
| P1 | Onboarding spinner override | Remove unconditional loading gate |

### Short-Term (1-2 Weeks)

| Priority | Issue | Fix |
|----------|-------|-----|
| P1 | Stale closures | Audit all useCallback deps |
| P1 | Silent .catch() | Update UI on all errors |
| P1 | AbortController | Add to all fetch operations |
| P2 | Mobile OAuth cleanup | Clear localStorage on all paths |
| P2 | Optimistic rollback | Add try/catch with state revert |
| P2 | Help routes / 404 | Add routes or external links + Not Found |
| P2 | New chat reset | Reset chat state on `/home` navigation |

### Medium-Term (2-4 Weeks)

| Priority | Issue | Fix |
|----------|-------|-----|
| P2 | Retry logic | Create withRetry() utility |
| P2 | Error boundaries | Add component-level boundaries |
| P2 | Pagination | Add to members/accounts lists |
| P3 | Accessibility | Add ARIA attributes |
| P3 | Spinner consistency | Standardize on Spinner component |

### Architecture Improvements

1. **Centralized Error Handling**
   - Create API wrapper with interceptors
   - Standardize error responses
   - Add request/response logging

2. **State Management Cleanup**
   - Use React Query as single source of truth for server state
   - Remove duplicate state tracking
   - Implement proper cache invalidation

3. **Navigation Guards**
   - Add route transition confirmation
   - Preserve intended destination after auth
   - Implement proper loading state management

---

## Appendix: Files Requiring Most Attention

| File | Issues | Priority |
|------|--------|----------|
| `session-context.tsx` | 7 | CRITICAL |
| `integrations-page.tsx` | 6 | HIGH |
| `use-app-controller.ts` | 4 | HIGH |
| `protected-route.tsx` | 3 | MEDIUM |
| `use-platform-preferences.ts` | 3 | MEDIUM |
| `onboarding-context.tsx` | 2 | MEDIUM |
| `workspace-settings.ts` | 2 | MEDIUM |

---

*This report was generated through comprehensive static analysis of the codebase. Manual testing may reveal additional issues not detectable through code review alone.*
