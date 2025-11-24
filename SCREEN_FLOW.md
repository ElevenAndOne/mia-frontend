# App screen flow and states

This document explains the screen flow, what states exist on each screen, and how they transition after user actions and context changes. It’s a companion doc to `src/App.tsx` and the various `src/contexts/*` providers (SessionContext, IntegrationsContext, AnalyticsContext, DateRangeContext, UIStateContext).

---

## High-level flow (top-level states)

The app uses an `appState` finite-state variable stored in `App.tsx`:
- `video-intro` — Intro video / sign-in prompt
- `account-selection` — Pick which account (or link) to use
- `main` — Main dashboard view
- `growth` — Growth flow / page
- `improve` — Optimize/Improve flow / page
- `fix` — Protect/Fix flow / page
- `creative` — Creative analysis page
- `integrations` — Manage integrations page
- `grow-quick`, `optimize-quick`, `protect-quick`, `summary-quick` — Quick insights screens

App-level boolean helper:
- `isAnyAuthenticated` = `isAuthenticated || isMetaAuthenticated` (from `SessionContext`)

---

## Contexts (used across pages)

- `SessionContext` — Authentication, `isLoading`, `isAuthenticated`, `isMetaAuthenticated`, `hasSeenIntro`, `selectedAccount`, `availableAccounts`, `logout`, `login`/`loginMeta`, `selectAccount`
- `IntegrationsContext` — Platform connection states: `platforms`, `integrations`, `isLoading`, `error`, `connectPlatform`, `disconnectPlatform`
- `AnalyticsContext` — `fetchAnalytics`, `getData`, `isLoading`, `errors`, and per-flow caches (growth/optimize/protect)
- `DateRangeContext` — Selected date range across insights & pages (7/30/90/custom)
- `UIStateContext` — Modal state (`activeModal`), loading overlay (`loadingState`) and UI toggles like burger menu

Each screen reads relevant contexts to render correct states, show modals, or trigger network actions.

---

## Screen-by-screen breakdown (what each screen shows and what state it consumes)

### 1) `video-intro` (VideoIntroView) 🎬
- Key context/state
  - `SessionContext.hasSeenIntro` — if true we may skip this screen on first render
  - `SessionContext.isAuthenticated` / `isMetaAuthenticated` — whether to show login modals
  - `UIStateContext.activeModal` — if a login modal (Figma or OAuth) is opened
- States shown
  - Loading spinner if `SessionContext.isLoading` (session check in progress)
  - Intro video and CTA
  - Login modal automatically shown if user tries to sign-in from this screen
- Transition triggers
  - After `hasSeenIntro` is set and `isAnyAuthenticated && selectedAccount` → go to `main`
  - After `hasSeenIntro` is set and `isAnyAuthenticated && !selectedAccount` → go to `account-selection`
  - On `Login` success: `onAuthSuccess` callback → App decides `main` vs `account-selection` depending on `selectedAccount`
  - If user is unauthenticated or cancels → stay on `video-intro`

### 2) `account-selection` (AccountSelectionPage) 🧾
- Key context/state
  - `SessionContext.availableAccounts`, `isLoading`, `selectAccount` handler, `logout`
  - `UIStateContext` - modals for help and industry
- States shown
  - `loading` while `SessionContext.isLoading` or while fetching accounts
  - Account list + selected state
  - Empty state if no available accounts (CTA to connect accounts)
  - Error state if `SessionContext.error` is present
- Transition triggers
  - On `selectAccount` success → set `appState = 'integrations'` (App automatically navigates to integrations after selection)
  - On back/logout → `logout()` triggers `video-intro` (App resets to video intro)

### 3) `main` (MainViewCopy) 🏠
- Key context/state
  - `SessionContext.selectedAccount`, `isAnyAuthenticated`
  - `IntegrationsContext.platforms`, `isConnected` (for badges and status) — `IntegrationsContext.refreshIntegrations()` is typically run
  - `UIStateContext` for quick UI modals
  - `AnalyticsContext` may prefetch summary stats
- States shown
  - Main dashboard UI with nav to Growth / Optimize / Protect / Creative
  - `loading` state while account or session is being restored
  - Empty boundaries if `selectedAccount === null` → redirect to `account-selection`
- Transition triggers
  - Clicking questions / cards → `handleQuestionClick('growth'|'improve'|'fix')` sets `preloadedData` and navigates to respective page (`growth`, `improve`, `fix`)
  - Quick insights buttons open `InsightsDatePickerModal` with `pendingInsightType` and then navigate to `grow-quick`, `optimize-quick`, or `protect-quick` on generate
  - Clicking `Integrations` navigates to the `integrations` page

### 4) `integrations` (IntegrationsPage) 🔌
- Key context/state
  - `IntegrationsContext.integrations`, `platforms`, `isLoading`, `connectPlatform`, `disconnectPlatform`
  - `SessionContext.selectedAccount` (to bind links to specific account)
- States shown
  - Loading spinner while `IntegrationsContext.isLoading` is true
  - List of integrations each with `connected`, `lastSync`, `autoSync` and CTA to connect/disconnect
  - Error UI when `IntegrationsContext.error` present
- Transition triggers
  - After connecting or disconnecting a service, `refreshIntegrations()` updates statuses; UI may show success notice
  - Back button navigates to `main`

### 5) `growth`, `improve` (OptimizePage), `fix` (ProtectPage) — long-form analysis pages 📈
- Shared states
  - `SessionContext.isAnyAuthenticated` must be true to show these pages
  - `AnalyticsContext.fetchAnalytics()` for initial data fetch based on question + dateRange
  - `DateRangeContext` affects date range selection and `AnalyticsContext` cache key
  - `UIStateContext` for modals and loader overlays
  - `preloadedData` from `preloadedData` in `App.tsx` (passed to page as `data` prop) — pre-fetched answers or quick context from main
- States shown
  - `loading`: while `AnalyticsContext.isLoading(<type>)` is true
  - Error: show message from `AnalyticsContext.getError(<type>)` if present
  - Content: chart/cards derived from `AnalyticsContext.getData(<type>)`
  - Empty: page displays call-to-action if missing account or integrations
- Transition triggers
  - User changes date range → `DateRangeContext.setDateRange` → triggers fetch or `fetchAnalytics(..., forceRefresh=true)` (page responsible for refetch)
  - Click `back` → returns to `main` and clears `preloadedData`

### 6) `creative` (CreativePageFixed) 🎨
- Key context/state
  - `SessionContext.isAnyAuthenticated`, `selectedAccount` (if required to fetch assets)
  - Page local state for creative insights and image processing
- States shown
  - `loading` during model inferencing / processing
  - `result` view with suggestions and creative highlights
  - `error` if creative API fails
- Transition triggers
  - Clicking `back` → returns to `main` and clears preloaded data

### 7) Quick insights screens (`grow-quick`, `optimize-quick`, `protect-quick`, `summary-quick`) ⚡
- Key context/state
  - `pendingInsightType` + `selectedInsightDateRange` held by `App.tsx` (initial props: `initialDateRange`)
  - `AnalyticsContext` is used to fetch short-form insights using `getData` & `fetchAnalytics`
- States shown
  - Date picker modal (from `App.tsx`) for selecting `selectedInsightDateRange`
  - Loading, error, content derived from `AnalyticsContext` like other pages
- Transition triggers
  - Generate date → `handleInsightsDateGenerate` sets `selectedInsightDateRange` and navigates to the correct quick-insights view
  - `onBack` returns to `main`

### 8) `InsightsDatePickerModal` (modal) 📅
- Key context/state
  - `UIStateContext.activeModal` or `App.tsx`-local `showInsightsDatePicker` boolean
  - `App.tsx` uses `pendingInsightType` to know what flow to open on select
- States shown
  - Selected date range, custom date pickers, and generate button
- Transition triggers
  - On generate → `onGenerate(dateRange)` → closes modal and navigates to quick insight route using selected range

### 9) Global Loading / Error states 🟡🔴
- `SessionContext.isLoading` — when the initial session/available account fetch is running or logging in/out
- `UIStateContext.loadingState` — for UI-level blocking loaders (e.g., connecting integration)
- `AnalyticsContext` — per-type loading flags
- Each page has `onBack` and `onError` handlers which will drive navigation to safe states (generally `main` or `video-intro`)

---

## Typical user journeys (sequences & state changes)

1) New user, first visit → Quick flow
   - `video-intro` (user watches video) → after the video: show prompt for sign up/login
   - On login success → `hasSeenIntro = true` set either in session or server. If `selectedAccount` exists: `setAppState('main')` else `setAppState('account-selection')`

2) Returning user (stored session) → Shortcut
   - App checks session on mount (`SessionContext.initializeSession`). If `hasSeenIntro === true` && `isAnyAuthenticated === true` && `selectedAccount` → `setAppState('main')`

3) User logs in (no selectedAccount) → Choose account
   - `video-intro` → on login or `checkExistingAuth`, App sets `isAuthenticated` and `hasSeenIntro`, then navigates to `account-selection`
   - Selecting an account calls `SessionContext.selectAccount` → on success `App` sets `appState='integrations'`

4) User selects account → Integrations → Main
   - `account-selection` → after selection, navigate to `integrations` to check or connect platforms
   - After connecting or verifying integrations, user typically returns to `main` where dashboard shows account-specific stats

5) From main → Deep dive / quick insights
   - `main` → click `Grow`/`Improve`/`Fix` → `appState` sets `growth`/`improve`/`fix`. The page calls `AnalyticsContext.fetchAnalytics(...)`.
   - `main` → click quick insights → `showInsightsDatePicker` modal opens → after generating, `grow-quick|optimize-quick|protect-quick` opens with `selectedInsightDateRange` and calls `AnalyticsContext.fetchAnalytics(..., dateRange)`

6) Logout
   - Any page `logout()` → Session clears; App resets to `video-intro` with a new session id and `selectedAccount` = null

---

## Implementation notes & tips (developer guidance) 🔧

- Centralize business logic into contexts. Pages should be presentation-only where possible.
- Use `AnalyticsContext.fetchAnalytics(type, question, dateRange)` to fetch & cache analytics for a given page, ensuring consistent loading and error handling UI.
- Prefetch `preloadedData` on `main` for fast transitions into `growth/improve/fix` pages.
- When adding a new screen, add a new `AppState` entry and keep transitions minimal and deterministic:
  - Add screen-specific states to `AnalyticsContext` (if needed) and `UIStateContext` for modal handling
  - Ensure `isAnyAuthenticated` is enforced; otherwise redirect to `video-intro` or `account-selection`
- `DateRangeContext` is ideal for cross-screen date range sync.
- Global error messaging is handled via each context; render `UIStateContext.loadingState` overlay for blocking operations.

---

## Quick reference (state change mapping)

- After login success → `isAuthenticated = true` → if `selectedAccount` → `main` else `account-selection`
- After `selectAccount` success → `selectedAccount` present → `integrations`
- After `integrations` connect/disconnect → `IntegrationsContext.refreshIntegrations()` updates `platforms`
- Clicking a question on `main` → `preloadedData` set → `appState` changes to `growth`/`improve`/`fix`
- Insights quick pick → modal opens (`showInsightsDatePicker`) and `pendingInsightType` set; generate → `selectedInsightDateRange` set & open respective quick insight view
- Logout → generate new session id, clear `selectedAccount`, `hasSeenIntro` remains persisted for returning user logic

---

If you'd like, I can add a diagram depicting the state machine and transitions, or a short per-screen checklist of UI elements to test for each state (loading, error, empty, content). ✅
