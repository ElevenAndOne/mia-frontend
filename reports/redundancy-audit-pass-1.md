# Redundancy Audit - Pass 1
Date: 2026-01-31
Scope: src/** (components, features, routes, utils), with spot checks in public assets for icon usage.

## Findings

### 1) Date range selection is duplicated and inconsistent
- `src/components/date-range-selector.tsx` and `src/components/insights-date-picker-modal.tsx` both define `DATE_RANGE_OPTIONS` and nearly identical custom-range logic and DayPicker classNames.
- `src/features/chat/components/date-range-sheet.tsx` implements a different option set (7/30/90/180/365) and its own formatting logic, so date range behavior differs across chat vs insights.
- `src/utils/date-display.ts` provides formatting but is not used by the chat date range popover (uses inline `toLocaleDateString`).

### 2) Loading spinners are repeated as ad hoc markup
- `src/components/spinner.tsx` exists, but many files use inline `div` with `animate-spin` and custom borders.
- Examples: `src/routes/index.tsx`, `src/components/invite-landing-page.tsx`, `src/components/main-view.tsx`, `src/components/figma-login-modal.tsx`, `src/components/create-workspace-modal.tsx`, `src/components/combined-account-selection.tsx`, `src/components/workspace-switcher.tsx`, `src/components/brevo-connection-modal.tsx`, `src/components/meta-account-selection-page.tsx`, `src/features/integrations/integrations-page.tsx`, `src/features/integrations/selectors/ga4-property-selector.tsx`, `src/features/insights/components/insight-page.tsx`, `src/features/insights/components/summary-insights.tsx`.

### 3) Alert / status message UI is repeated
- `src/components/alert.tsx` is available, but many components render their own red/green boxes with duplicated markup and icons.
- Examples: `src/components/brevo-connection-modal.tsx`, `src/components/combined-account-selection.tsx`, `src/components/meta-account-selection-page.tsx`, `src/components/workspace-settings-page.tsx`, `src/features/integrations/selectors/ga4-property-selector.tsx`, `src/features/integrations/integrations-page.tsx`, `src/features/insights/components/summary-insights.tsx`, `src/features/insights/components/insight-page.tsx`.

### 4) Modal/overlay patterns are inconsistent
- Overlay system exists (`src/features/overlay/components/modal.tsx`, `popover.tsx`, `dropdown.tsx`, etc.), but several modals and popovers are custom-built.
- `src/components/figma-login-modal.tsx` uses a fixed-position modal with inline styles (not `Modal`).
- `src/components/insights-date-picker-modal.tsx` uses `OverlayPortal` and manual panel instead of `Modal`.
- `src/features/chat/components/platform-selector.tsx` renders its own anchored panel instead of `Popover` or `Dropdown`.

### 5) Platform configuration is duplicated and inconsistent
- `src/components/main-view.tsx` and `src/features/chat/components/chat-view.tsx` define separate platform configs with different icons and IDs (`google_ads`/`meta_ads` vs `google`/`meta` elsewhere).
- `src/features/integrations/integrations-page.tsx` defines its own integrations list with different IDs and icon sources.
- `src/components/logo.tsx` provides SVG logos, but other views rely on `/public/icons` assets or inline SVGs, so icon sources are inconsistent.

### 6) Platform selection UI is duplicated
- Chat uses `src/features/chat/components/platform-selector.tsx` (custom toggle control).
- Main view uses its own platform toggle buttons and icon grid in `src/components/main-view.tsx`.
- No shared component for the platform toggle/list behavior.

### 7) Quick action buttons duplicated (Grow/Optimize/Protect)
- `src/features/chat/components/quick-actions.tsx` defines quick action buttons.
- `src/components/main-view.tsx` renders the same actions with separate styling and logic.

### 8) Chat UI duplication (legacy vs current)
- `src/features/chat/components/*` implements chat input, message display, and chat request handling.
- `src/components/main-view.tsx` also implements chat input, message list, and `apiFetch('/api/chat')` logic.
- This is likely a legacy duplicate of chat behavior for `/dashboard` vs `/home`.

### 9) Icon usage is fragmented
- Large shared icon sets exist (`src/components/icon.tsx`, `src/components/logo.tsx`), but many components embed inline SVGs (close icons, checkmarks, platform icons, etc.), duplicating markup and styling.
- Examples: `src/components/brevo-connection-modal.tsx`, `src/components/insights-date-picker-modal.tsx`, `src/components/platform-gear-menu.tsx`, `src/components/create-workspace-modal.tsx`, `src/components/meta-account-selection-page.tsx`, `src/features/integrations/selectors/ga4-property-selector.tsx`.

### 10) Header/back button patterns are repeated
- `src/components/top-bar.tsx` and `src/components/back-button.tsx` exist, but multiple screens implement their own header/back markup.
- Examples: `src/components/combined-account-selection.tsx`, `src/components/meta-account-selection-page.tsx`, `src/components/workspace-settings-page.tsx`, `src/components/workspace-switcher.tsx`.

## Notes
- No code changes made in this pass.
- This pass focuses on visible UI duplication and layout patterns.
