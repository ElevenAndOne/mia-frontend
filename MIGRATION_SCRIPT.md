# Automated Migration Script for apiFetch → SDK

## Component Migration Patterns

Here are the specific migration patterns for each component that needs updating:

### 1. HubSpot Account Selector ✅ DONE
**File**: `src/components/selectors/hubspot-account-selector.tsx`
**Status**: Completed + Refactored version created

**Before**:
```tsx
import { apiFetch } from '../../utils/api'
const { sessionId } = useSession()

// Manual API calls with headers
const response = await apiFetch(`/api/oauth/hubspot/accounts?session_id=${sessionId}`, {
  headers: { 'X-Session-ID': sessionId || 'default' }
})
```

**After**:
```tsx
import { useHubSpot } from '../../hooks/useMiaSDK'

// Clean hook with loading/error states
const { getAccounts, selectAccount, disconnectAccount, isLoading, error } = useHubSpot()

// Simple method calls
const result = await getAccounts()
```

### 2. Brevo Account Selector 🔄 IN PROGRESS
**File**: `src/components/selectors/brevo-account-selector.tsx`

**Required Changes**:
- Replace `apiFetch` with `useBrevo()` hook
- Update interface to match SDK BrevoAccount type
- Remove manual session management

**Migration Commands**:
```tsx
// Replace imports
- import { apiFetch } from '../../utils/api'
+ import { useBrevo } from '../../hooks/useMiaSDK'

// Replace hook usage
- const { sessionId } = useSession()
+ const { getAccounts, selectAccount, disconnectAccount, isLoading, error } = useBrevo()

// Replace API calls
- await apiFetch(`/api/oauth/brevo/accounts?session_id=${sessionId}`)
+ await getAccounts()

- await apiFetch('/api/oauth/brevo/select-account', { body: {...} })
+ await selectAccount(brevoId, accountId)

- await apiFetch(`/api/oauth/brevo/disconnect?brevo_id=${brevoId}`)
+ await disconnectAccount(brevoId)
```

### 3. Facebook Page Selector 📋 TODO
**File**: `src/components/selectors/facebook-page-selector.tsx`

**API Calls to Migrate**:
- `GET /api/oauth/meta/api/organic/facebook-pages` → `sdk.facebook.getPages()`
- `POST /api/oauth/meta/api/organic/link-page` → `sdk.facebook.linkPage(pageId)`

**Migration Pattern**:
```tsx
import { useFacebook } from '../../hooks/useMiaSDK'

const { getPages, linkPage, isLoading, error } = useFacebook()
```

### 4. Meta Account Selector 📋 TODO
**File**: `src/components/selectors/meta-account-selector.tsx`

**API Calls to Migrate**:
- `GET /api/oauth/meta/api/accounts/available` → `sdk.facebook.getMetaAccounts()`
- `POST /api/oauth/meta/api/accounts/link` → `sdk.facebook.linkMetaAccount()`

### 5. GA4 Property Selector 📋 TODO
**File**: `src/components/selectors/ga4-property-selector.tsx`

**API Calls to Migrate**:
- `GET /api/accounts/available` → `sdk.platform.getAvailableAccounts()`
- `POST /api/accounts/link-platform` → `sdk.platform.linkGA4Properties()`

### 6. Account Selection Page 📋 TODO
**File**: `src/components/pages/account-selection-page.tsx`

**API Calls to Migrate**:
- `GET /api/oauth/google/ad-accounts` → `sdk.platform.getGoogleAdAccounts()`
- `GET /api/industries` → `sdk.platform.getIndustries()`
- `POST /api/session/select-mcc` → `sdk.platform.selectMCC()`

### 7. Creative Page 📋 TODO
**File**: `src/components/pages/creative-page-fixed.tsx`

**API Calls to Migrate**:
- `POST /api/creative-analysis` → `sdk.creative.analyzeCreativeWithSession()`

### 8. Integrations Page 📋 TODO
**File**: `src/components/pages/integrations-page.tsx`

**API Calls to Migrate**:
- Multiple platform status checks → `sdk.platform.getPlatformStatus()`
- HubSpot/Brevo status → Individual service methods

### 9. Brevo Connection Modal 📋 TODO
**File**: `src/components/modals/brevo-connection-modal.tsx`

**API Calls to Migrate**:
- `POST /api/oauth/brevo/save-api-key` → `sdk.brevo.saveApiKey()`

### 10. Main View Copy (Chat) 📋 TODO
**File**: `src/components/pages/main-view-copy.tsx`

**API Calls to Migrate**:
- `POST /api/chat` → `sdk.chat.sendMessage()`

---

## Migration Automation Commands

### Quick Find & Replace Patterns

1. **Remove apiFetch imports**:
```bash
find src/components -name "*.tsx" -exec sed -i '' 's/import { apiFetch } from [^;]*;//g' {} \;
```

2. **Add SDK hook imports** (manual - depends on component):
```tsx
// For HubSpot components
import { useHubSpot } from '../../hooks/useMiaSDK'

// For Brevo components  
import { useBrevo } from '../../hooks/useMiaSDK'

// For Meta/Facebook components
import { useFacebook } from '../../hooks/useMiaSDK'

// For general platform operations
import { usePlatform } from '../../hooks/useMiaSDK'

// For creative analysis
import { useCreative } from '../../hooks/useMiaSDK'

// For chat functionality
import { useChat } from '../../hooks/useMiaSDK'
```

3. **Remove sessionId usage**:
```bash
# Find all sessionId usage in components
grep -r "sessionId" src/components --include="*.tsx"

# Most can be removed since SDK handles session automatically
```

---

## Validation Checklist

After migration, verify each component:

- [ ] No `apiFetch` imports remain
- [ ] No manual `X-Session-ID` header management
- [ ] No direct `sessionId` usage from context
- [ ] SDK hooks provide loading states
- [ ] Error handling uses hook's error state
- [ ] TypeScript errors are resolved
- [ ] Component functionality is preserved

---

## Testing Strategy

1. **Unit Tests**: Update component tests to mock SDK hooks instead of apiFetch
2. **Integration Tests**: Verify end-to-end flows work with SDK
3. **Manual Testing**: Test each component's core functionality

---

## Benefits After Migration

### Developer Experience Improvements:
- ✅ **No more manual session management** - SDK handles it automatically
- ✅ **Built-in loading states** - No more manual loading state management  
- ✅ **Consistent error handling** - Standardized error patterns across all components
- ✅ **Type safety** - Full TypeScript support with proper return types
- ✅ **Cleaner code** - Reduced boilerplate, focus on business logic
- ✅ **Easy testing** - Mock SDK hooks instead of individual fetch calls
- ✅ **Centralized API logic** - All HTTP requests go through SDK services

### Example Code Reduction:
```tsx
// Before (25+ lines)
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const { sessionId } = useSession()

const fetchAccounts = async () => {
  setIsLoading(true)
  setError(null)
  try {
    const response = await apiFetch('/api/oauth/hubspot/accounts', {
      headers: { 'X-Session-ID': sessionId || 'default' }
    })
    const data = await response.json()
    if (data.success) {
      setAccounts(data.accounts)
    } else {
      setError(data.error)
    }
  } catch (err) {
    setError('Failed to fetch accounts')
  } finally {
    setIsLoading(false)
  }
}

// After (3 lines!)
const { getAccounts, isLoading, error } = useHubSpot()

const fetchAccounts = async () => {
  const result = await getAccounts()
  if (result.success) setAccounts(result.data!)
}
```

This represents a **80%+ reduction in boilerplate code** while adding better error handling and loading states!
