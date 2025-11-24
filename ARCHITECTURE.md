# MIA Frontend Architecture Guide

## 🏗️ Architecture Overview

The MIA frontend follows a **composability-first architecture** built on React context providers and custom hooks. This document outlines the architectural patterns, best practices, and guidelines for working with the codebase.

## 📐 Core Principles

1. **Separation of Concerns**: Each context manages one specific domain
2. **Composability**: Components are small, focused, and reusable
3. **Type Safety**: Full TypeScript coverage with explicit interfaces
4. **Error Handling**: Built-in error checking in all custom hooks
5. **Performance**: Smart caching and minimal re-renders

## 🗂️ Project Structure

```
src/
├── contexts/                    # Context providers with custom hooks
│   ├── SessionContext.tsx       # Authentication & user session
│   ├── DateRangeContext.tsx     # Date range selection
│   ├── UIStateContext.tsx       # Modal & loading states
│   ├── AnalyticsContext.tsx     # Analytics data & caching
│   ├── IntegrationsContext.tsx  # Platform connections
│   └── index.ts                 # Centralized exports
│
├── components/
│   ├── layouts/                 # Composable layout components
│   │   ├── PageLayout.tsx       # Page wrapper with header/footer
│   │   ├── Modal.tsx            # Modal component
│   │   ├── Card.tsx             # Card components family
│   │   ├── InsightCard.tsx      # Analytics-specific cards
│   │   └── index.ts             # Centralized exports
│   │
│   ├── GrowthPageRefactored.tsx # Example refactored page
│   ├── OptimizePageRefactored.tsx
│   └── [other components]
│
├── services/                    # API service layer
│   ├── accountService.ts
│   ├── auth.ts
│   └── [other services]
│
├── utils/
│   └── api.ts                   # API fetch wrapper
│
├── styles/                      # Tailwind token files
└── main.tsx                     # Provider composition
```

## 🎯 Context Architecture

### Provider Hierarchy

Context providers are composed in `main.tsx` in this specific order:

```tsx
<BrowserRouter>
  <SessionProvider>           {/* Level 1: Authentication */}
    <DateRangeProvider>       {/* Level 2: User preferences */}
      <UIStateProvider>       {/* Level 3: UI state */}
        <AnalyticsProvider>   {/* Level 4: Data fetching */}
          <IntegrationsProvider>  {/* Level 4: Platform data */}
            <App />
          </IntegrationsProvider>
        </AnalyticsProvider>
      </UIStateProvider>
    </DateRangeProvider>
  </SessionProvider>
</BrowserRouter>
```

**Order rationale**:
1. Session first - needed by all other contexts
2. User preferences (DateRange) - independent of data
3. UI state - independent of data
4. Data contexts (Analytics, Integrations) - depend on session

### Context Responsibilities

#### 1. SessionContext
**Purpose**: Manage authentication, user profile, and account selection

**State**:
- `isAuthenticated`, `isMetaAuthenticated` - Auth status
- `user` - User profile data
- `sessionId` - Current session ID
- `selectedAccount` - Active account
- `availableAccounts` - User's accounts

**Actions**:
```tsx
login()                    // OAuth login flow
logout()                   // Clear session
selectAccount(id)          // Switch accounts
refreshAccounts()          // Reload account list
```

**When to use**: Any component needing auth status or user data

#### 2. DateRangeContext
**Purpose**: Centralized date range selection for analytics

**State**:
- `selectedRange` - '7_days' | '30_days' | '90_days' | 'custom'
- `customStart`, `customEnd` - Custom date range bounds

**Actions**:
```tsx
setDateRange(range, start?, end?)  // Update selection
getDateRangeLabel()                // Human-readable label
getDateRangeDays()                 // Calculate days
```

**When to use**: Analytics pages, date pickers, insights components

#### 3. UIStateContext
**Purpose**: Manage modals, loading states, and navigation UI

**State**:
- `activeModal` - Currently open modal
- `modalData` - Data passed to modal
- `loadingState` - Global loading indicator
- `showBurgerMenu` - Burger menu visibility

**Actions**:
```tsx
openModal(type, data?)     // Open modal with data
closeModal()               // Close active modal
setLoading(bool, msg?)     // Show/hide loader
toggleBurgerMenu()         // Toggle menu
```

**When to use**: Any component with modals or loading states

#### 4. AnalyticsContext
**Purpose**: Fetch, cache, and manage analytics data

**State** (per type: growth/optimize/protect):
- Cached data with timestamp
- Loading states
- Error states

**Actions**:
```tsx
fetchAnalytics(type, question, dateRange)  // Fetch with cache
isLoading(type)                            // Check loading
getError(type)                             // Get error
getData(type)                              // Get cached data
clearCache(type?)                          // Invalidate cache
```

**Caching**: 5-minute cache per type+dateRange combination

**When to use**: GrowthPage, OptimizePage, ProtectPage

#### 5. IntegrationsContext
**Purpose**: Manage platform connections (Google, Meta, Brevo, etc.)

**State**:
- Platform statuses (connected, linked, last_synced)
- Integration list
- Loading/error states

**Actions**:
```tsx
refreshIntegrations()          // Reload statuses
connectPlatform(id)            // Connect integration
disconnectPlatform(id)         // Disconnect integration
getPlatformStatus(id)          // Get status
isConnected(id)                // Quick check
isLinked(id)                   // Quick check
```

**When to use**: IntegrationsPage, platform connection flows

## 🧩 Composable Components

### PageLayout

Standard page wrapper with consistent structure:

```tsx
<PageLayout
  showBackButton={true}
  onBack={() => navigate(-1)}
  headerContent={<div>Custom Header</div>}
  footerContent={<div>Custom Footer</div>}
  animate={true}
>
  {/* Page content */}
</PageLayout>
```

### Modal

Flexible modal with overlay and animations:

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="md"  // sm | md | lg | xl | full
  showCloseButton={true}
  closeOnOverlayClick={true}
>
  {/* Modal content */}
</Modal>
```

### Card Family

Building blocks for content sections:

```tsx
<Card padding="md" shadow="lg" rounded="xl">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

### InsightCard

Analytics-specific cards:

```tsx
<InsightCard
  value="1,234"
  label="Total Conversions"
  trend="+12%"
  unit="conversions"
  icon={<Icon />}
/>

<InsightList
  insights={[
    "Insight 1",
    "Insight 2",
    "Insight 3"
  ]}
/>
```

## 📝 Usage Patterns

### Pattern 1: Analytics Page

```tsx
import { useAnalytics, useDateRange, useUIState } from '@/contexts'
import { PageLayout, InsightCard } from '@/components/layouts'

const MyAnalyticsPage = ({ onBack }) => {
  const { fetchAnalytics, isLoading, getData } = useAnalytics()
  const { dateRange } = useDateRange()
  const { setLoading } = useUIState()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true, 'Loading insights...')
      await fetchAnalytics('growth', 'My question', dateRange.selectedRange)
      setLoading(false)
    }
    loadData()
  }, [dateRange.selectedRange])

  const data = getData('growth')
  
  return (
    <PageLayout showBackButton onBack={onBack}>
      <div className="space-y-4">
        <InsightCard 
          value={data?.value} 
          label={data?.label} 
        />
      </div>
    </PageLayout>
  )
}
```

### Pattern 2: Modal Management

```tsx
import { useUIState } from '@/contexts'
import { Modal } from '@/components/layouts'

const MyComponent = () => {
  const { activeModal, openModal, closeModal, modalData } = useUIState()

  const handleConnect = () => {
    openModal('brevo-account-selector', { 
      accountId: '123' 
    })
  }

  return (
    <>
      <button onClick={handleConnect}>Connect Brevo</button>
      
      <Modal
        isOpen={activeModal === 'brevo-account-selector'}
        onClose={closeModal}
        title="Select Brevo Account"
      >
        <BrevoAccountSelector data={modalData} />
      </Modal>
    </>
  )
}
```

### Pattern 3: Integration Status

```tsx
import { useIntegrations } from '@/contexts'

const PlatformCard = ({ platformId }) => {
  const { 
    isConnected, 
    isLinked, 
    getPlatformStatus,
    connectPlatform 
  } = useIntegrations()

  const status = getPlatformStatus(platformId)
  const connected = isConnected(platformId)

  return (
    <div>
      <h3>{platformId}</h3>
      <p>Status: {connected ? 'Connected' : 'Not connected'}</p>
      <p>Last sync: {status.last_synced}</p>
      <button onClick={() => connectPlatform(platformId)}>
        Connect
      </button>
    </div>
  )
}
```

## 🎨 Styling Guidelines

### Tailwind Token Usage

Prefer semantic token classes over raw values:

```tsx
// ✅ Good - using tokens
<div className="bg-background-primary text-text-primary p-spac-4">

// ❌ Bad - hard-coded values
<div className="bg-white text-gray-900 p-4">
```

### Token Files

- `colors-primitive.css` - Base color palette
- `colors-token.css` - Semantic color tokens
- `colors-utility.css` - Utility color classes
- `spac-primitive.css` - Spacing scale
- `tokens.css` - Typography, shadows, etc.

### Safe Areas

Use safe area utilities for mobile:

```tsx
<div className="safe-top">Top content</div>
<div className="safe-bottom">Bottom content</div>
<div className="safe-full">Full height with safe areas</div>
```

## 🔧 Development Workflow

### Adding a New Page

1. **Import contexts**:
```tsx
import { useAnalytics, useDateRange } from '@/contexts'
import { PageLayout, Card } from '@/components/layouts'
```

2. **Use layout components**:
```tsx
<PageLayout showBackButton onBack={onBack}>
  <Card>
    {/* Content */}
  </Card>
</PageLayout>
```

3. **Fetch data with caching**:
```tsx
useEffect(() => {
  fetchAnalytics('type', question, dateRange.selectedRange)
}, [dateRange])
```

### Adding a New Context

1. **Create context file**:
```tsx
// src/contexts/MyContext.tsx
import { createContext, useContext } from 'react'

const MyContext = createContext(undefined)

export const useMyContext = () => {
  const context = useContext(MyContext)
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider')
  }
  return context
}

export const MyProvider = ({ children }) => {
  // State and actions
  return <MyContext.Provider value={...}>{children}</MyContext.Provider>
}
```

2. **Add to provider composition**:
```tsx
// src/main.tsx
<SessionProvider>
  <MyProvider>  {/* Add in appropriate position */}
    <App />
  </MyProvider>
</SessionProvider>
```

3. **Export from index**:
```tsx
// src/contexts/index.ts
export { MyProvider, useMyContext } from './MyContext'
```

## 🧪 Testing Strategy

### Testing Contexts

```tsx
import { renderHook, act } from '@testing-library/react'
import { MyProvider, useMyContext } from './MyContext'

test('should update state', () => {
  const wrapper = ({ children }) => <MyProvider>{children}</MyProvider>
  const { result } = renderHook(() => useMyContext(), { wrapper })
  
  act(() => {
    result.current.updateState('new value')
  })
  
  expect(result.current.state).toBe('new value')
})
```

### Testing Components

```tsx
import { render, screen } from '@testing-library/react'
import { MyProvider } from '@/contexts'
import MyComponent from './MyComponent'

test('renders with context', () => {
  render(
    <MyProvider>
      <MyComponent />
    </MyProvider>
  )
  
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

## 📊 Performance Optimization

### Caching Strategy

- **Analytics**: 5-minute cache per type+dateRange
- **Integrations**: Refresh on account switch
- **Session**: Persisted in localStorage

### Preventing Re-renders

Use `useCallback` and `useMemo` in contexts:

```tsx
const fetchData = useCallback(async () => {
  // Fetch logic
}, [dependency])

const computedValue = useMemo(() => {
  return expensiveComputation(data)
}, [data])
```

### Code Splitting

Lazy load heavy components:

```tsx
const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

## 🐛 Error Handling

### Context Hook Errors

All hooks throw if used outside provider:

```tsx
const context = useContext(MyContext)
if (!context) {
  throw new Error('useMyContext must be used within MyProvider')
}
```

### API Error Handling

Contexts catch and store errors:

```tsx
try {
  await apiFetch('/endpoint')
} catch (error) {
  setState(prev => ({
    ...prev,
    error: error.message
  }))
}
```

### User-Facing Errors

Display errors with UI components:

```tsx
{error && (
  <Card className="bg-red-50">
    <p className="text-red-800">{error}</p>
  </Card>
)}
```

## 🚀 Migration Checklist

When refactoring an existing component:

- [ ] Identify duplicated state (data fetching, modals, loading)
- [ ] Replace with appropriate context hooks
- [ ] Remove local state management
- [ ] Use layout components (`PageLayout`, `Card`, etc.)
- [ ] Remove hard-coded styles (use tokens)
- [ ] Add error handling UI
- [ ] Test edge cases (loading, error, empty states)
- [ ] Update tests
- [ ] Document changes in CHANGELOG.md

## 📚 Resources

- [React Context Documentation](https://react.dev/reference/react/useContext)
- [Custom Hooks Guide](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Composition vs Inheritance](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)
- [Tailwind CSS v4](https://tailwindcss.com/docs)

---

**Last Updated**: November 24, 2025  
**Version**: 2.0.0
