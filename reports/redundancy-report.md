# Redundancy and Consistency Audit (Combined Report)
Date: 2026-01-31
Passes: 1-3 (stable, no new findings on pass 3)
Scope: src/** with focus on UI duplication, types, data flow, and utilities.

## Consolidated Findings

### A) Platform definitions and icon sources are fragmented
- Platform configs are redefined in multiple places with different IDs and icon sources:
  - `src/components/main-view.tsx` (`google_ads`, `meta_ads`, image icons)
  - `src/features/chat/components/chat-view.tsx` (Logo components, `google_ads`, `meta_ads`)
  - `src/features/integrations/integrations-page.tsx` (`google`, `meta`, `facebook_organic`, etc)
- Platform icons exist in multiple systems: `src/components/logo.tsx`, `src/features/onboarding/components/platform-icon.tsx`, `/public/icons/*`, and inline SVGs.
- Result: repeated config logic, inconsistent IDs, and inconsistent visuals.

### B) Date range logic and UI are duplicated and inconsistent
- `src/components/date-range-selector.tsx` and `src/components/insights-date-picker-modal.tsx` both define `DATE_RANGE_OPTIONS`, custom-range logic, and nearly identical DayPicker classNames.
- `src/features/chat/components/date-range-sheet.tsx` uses a different options set and its own formatting logic.
- `src/utils/date-display.ts` exists but is not used in chat date range UI; locale formats differ across files.

### C) Overlay/modal usage is inconsistent
- Overlay system exists (`src/features/overlay/*`), but several modals/panels are custom:
  - `src/components/figma-login-modal.tsx` custom fixed modal
  - `src/components/insights-date-picker-modal.tsx` custom overlay panel
  - `src/features/chat/components/platform-selector.tsx` custom popover panel
  - `src/components/workspace-switcher.tsx` custom absolute panel
- Multiple modals duplicate header and close button patterns despite `Modal` and `CloseButton` components.

### D) Loading and alert UI are repeated ad hoc
- `src/components/spinner.tsx` exists but many files render inline spinners.
- `src/components/alert.tsx` exists but many files render their own success/error banners.
- This introduces duplicated styling and inconsistent UX.

### E) Selection controls are re-implemented
- `src/components/radio.tsx` is only used once.
- `src/features/integrations/selectors/components/selector-item.tsx` recreates radio/checkbox UI internally.
- `src/features/integrations/selectors/ga4-property-selector.tsx` builds a separate checkbox UI again.

### F) Chat UI is duplicated (legacy vs current)
- `src/components/main-view.tsx` reimplements chat input, message list, and `/api/chat` requests.
- `src/features/chat/components/*` provides a parallel chat implementation used on `/home`.
- This is a large source of redundant UI and logic.

### G) Data fetching is scattered across components
- Multiple screens/components call `apiFetch` directly instead of using hooks/services.
- Examples: `brevo-connection-modal`, `invite-landing-page`, `summary-insights`, `main-view`, `workspace-settings-page`, integration selectors, integrations page.
- `createSessionHeaders` in `src/utils/api.ts` is underused; header logic is repeated in many files.

### H) Type definitions are duplicated
- `PlatformStatus`, `GA4Property`, `LinkedGA4Property`, `AccountData` are defined in:
  - `src/features/integrations/types.ts`
  - `src/features/integrations/hooks/use-integration-status.ts`
  - `src/features/integrations/selectors/ga4-property-selector.tsx`
- Multiple overlapping `Platform` or account-related types exist with minor differences.

### I) Role display logic is duplicated
- Role-to-label/icon/badge logic appears in:
  - `src/components/workspace-settings-page.tsx`
  - `src/components/invite-landing-page.tsx`
  - `src/components/workspace-switcher.tsx`
- Results in inconsistent visuals and copy for the same roles.

### J) Misc duplicated utilities
- Clipboard logic repeated in `chat-message` and `workspace-settings`.
- `alert()` / `confirm()` used across multiple files instead of a unified confirm/alert UI.

## Consolidated Refactor Plan (Prioritized)

### 1) Decide on the primary chat surface and remove legacy duplication
- If `/dashboard` is truly legacy, deprecate or re-route it to the new `ChatView`.
- If `MainView` must remain, refactor it to compose `features/chat` components instead of maintaining a parallel chat implementation.

### 2) Centralize platform definitions and icon sources
- Create a single platform config module (e.g., `src/features/integrations/platform-config.ts` or `src/constants/platforms.ts`) that defines:
  - platform id, display name, backend status key, icon component, and any feature flags
- Use this config in `chat-view`, `main-view`, `integrations-page`, onboarding icons, and platform selectors.
- Consolidate icon usage to `Logo` (or a single `PlatformIcon` wrapper) and remove direct `/public/icons` usage where possible.

### 3) Unify date range logic
- Create a shared `date-range` module with:
  - options list
  - parse/format helpers
  - shared DayPicker classNames
- Replace `date-range-selector`, `insights-date-picker-modal`, and `date-range-sheet` with a single reusable picker that can render as Popover or Modal (using the overlay system).

### 4) Standardize overlay usage
- Use `Modal`, `Popover`, `Dropdown`, and `Sheet` consistently.
- Convert custom overlays (`figma-login-modal`, `insights-date-picker-modal`, `platform-selector`, `workspace-switcher`) to use overlay primitives or shared modal wrappers.
- Add a shared `ConfirmModal` (using `Modal`) and replace `alert()` / `confirm()` calls.

### 5) Consolidate selection controls
- Create a reusable `SelectionIndicator` (radio/checkbox) and use it in:
  - `SelectorItem`
  - `DateRangePopover`
  - `GA4PropertySelector` (checkbox and primary indicator)
- Retire the standalone `Radio` component or make it the shared indicator.

### 6) Replace ad hoc spinners and alert banners
- Expand `Spinner` to cover the common variants used in the app.
- Use `Alert` for success/error/info states across selectors, modals, insights, and account selection screens.

### 7) Move data fetching into services/hooks
- Extract component-level `apiFetch` usage into feature services and hooks:
  - Brevo API key flow, invite flow, summary insights, workspace members/invites, account selection, etc.
- Prefer `createSessionHeaders` to eliminate repeated header logic.
- Components should consume hooks with explicit response types.

### 8) Consolidate workspace role utilities
- Add a shared role utility (e.g., `src/features/workspace/role-utils.ts`) providing:
  - role labels, descriptions, badge classes, and icons
- Replace role switch statements in invite/workspace screens and switcher.

### 9) Consolidate clipboard and small utilities
- Create a small `use-clipboard` hook or `utils/clipboard.ts` for copy + status feedback.
- Reuse in `ChatMessage` and `WorkspaceSettings`.

### 10) Cleanup and align styling patterns
- Replace inline SVGs with `Icon` components where possible.
- Standardize button styles (especially for quick actions) using a shared presentational component.

## Proposed Implementation Order (Phase 4)
1. Platform config + icon consolidation (unlocks consistency in multiple areas).
2. Date range module + unified picker.
3. Overlay normalization (Modal/Popover/Confirm).
4. Spinner/Alert standardization.
5. Selection control unification.
6. Data fetching extraction into hooks/services.
7. Role utils + cleanup.
8. Clipboard utility and final cleanup.

---
This combined report is derived from passes 1-3 and will be used as the source of truth for refactor work.
