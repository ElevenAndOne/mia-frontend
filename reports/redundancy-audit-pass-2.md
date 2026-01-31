# Redundancy Audit - Pass 2
Date: 2026-01-31
Scope: src/** with focus on types, data flow, and utility consistency.

## New / Additional Findings (relative to Pass 1)

### 1) Types and schemas are duplicated across files
- `src/features/integrations/hooks/use-integration-status.ts` defines `PlatformStatus`, `GA4Property`, `LinkedGA4Property`, and `AccountData` locally.
- `src/features/integrations/types.ts` defines the same types (and more) but is not reused by the hook.
- `src/features/integrations/selectors/ga4-property-selector.tsx` redefines `GA4Property` and `LinkedGA4Property` again.

### 2) Data fetching is spread across components instead of services/hooks
- Components/screen files call `apiFetch` directly, which conflicts with the architecture rule (screens/components should consume data via hooks/services).
- Examples: `src/components/brevo-connection-modal.tsx`, `src/components/invite-landing-page.tsx`, `src/components/combined-account-selection.tsx`, `src/components/main-view.tsx`, `src/components/workspace-settings-page.tsx`, `src/features/insights/components/summary-insights.tsx`, `src/features/integrations/selectors/*.tsx`, `src/features/integrations/integrations-page.tsx`.
- `createSessionHeaders` in `src/utils/api.ts` is rarely used; most code re-creates header objects and session id handling manually.

### 3) Role mapping logic is duplicated
- `src/components/workspace-settings-page.tsx`, `src/components/invite-landing-page.tsx`, and `src/components/workspace-switcher.tsx` each define their own role-to-icon/label/badge/description mapping.
- This leads to inconsistent iconography and copy for the same roles.

### 4) Date formatting is repeated and inconsistent
- `src/utils/date-display.ts` uses `en-GB` month formatting.
- `src/components/main-view.tsx` and `src/features/chat/components/date-range-sheet.tsx` use `en-US` with different patterns.
- `src/features/integrations/selectors/brevo-account-selector.tsx` formats dates inline with default locale.

### 5) Selection indicators are re-implemented
- `src/components/radio.tsx` exists but is only used in `src/features/chat/components/date-range-sheet.tsx`.
- `src/features/integrations/selectors/components/selector-item.tsx` re-implements radio and checkbox UI internally.
- `src/features/integrations/selectors/ga4-property-selector.tsx` builds its own checkbox UI yet again.

### 6) Blocking alerts/confirmations are scattered
- Multiple files use `alert()`/`confirm()` directly, instead of the overlay/modal system.
- Examples: `src/components/figma-login-modal.tsx`, `src/components/platform-gear-menu.tsx`, `src/components/workspace-settings-page.tsx`, `src/features/integrations/integrations-page.tsx`, `src/features/integrations/selectors/brevo-account-selector.tsx`, `src/features/integrations/selectors/mailchimp-account-selector.tsx`.

### 7) Brevo API key flow duplicated in two places
- `src/components/brevo-connection-modal.tsx` posts to `/api/oauth/brevo/save-api-key`.
- `src/features/integrations/integrations-page.tsx` has separate Brevo modal logic that hits the same endpoint.

### 8) Workspace switcher overlay is custom instead of shared overlay
- `src/components/workspace-switcher.tsx` renders a custom absolute-position panel rather than using `Popover`/`Dropdown`/`Sheet` from `src/features/overlay`.

### 9) Clipboard handling duplicated
- `src/features/chat/components/chat-message.tsx` and `src/components/workspace-settings-page.tsx` both implement their own clipboard copy logic and success feedback.

### 10) Platform icons are duplicated across multiple sources
- `src/components/logo.tsx`, `src/features/onboarding/components/platform-icon.tsx`, and multiple inline SVGs all render platform icons.
- This makes icon usage inconsistent across onboarding, chat, and integrations.

## Notes
- No code changes made in this pass.
- This pass focuses on type reuse, data flow, and utility consistency.
