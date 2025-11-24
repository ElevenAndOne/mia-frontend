# mia-frontend agent guide

## Mission & stack awareness
- React 18/19 + TypeScript app built with Vite and React Router (`src/main.tsx` wraps `BrowserRouter` + `SessionProvider`); UI and flows live in `src/App.tsx` and `src/components`.
- Tailwind CSS v4 is configured through CSS imports (`src/index.css`) with token files in `src/styles/*`; no `tailwind.config.js` or PostCSS file should be reintroduced.
- Global state is driven by `SessionContext` (`src/contexts/SessionContext.tsx`) for auth, session ids, intro gating, and account selection; screens use the `useSession` hook.
- Remote calls go through `apiFetch` (`src/utils/api.ts`) and the service layer (`src/services/auth.ts`, `metaAuth.ts`, `metaAds.ts`, `accountService.ts`) to keep base URLs and headers consistent.
- Mobile-first, safe-area-friendly layout lives in `src/index.css` (safe-top/bottom helpers, fixed `.iphone-container`, gradient/animation vars). Preserve the single-root layout and avoid new wrappers.

## Styling, tokens, and primitives
- Use Tailwind utilities plus the token maps in `src/styles/colors-primitive.css`, `colors-token.css`, `colors-utility.css`, `spac-primitive.css`, and `tokens.css`; prefer semantic classes (e.g., background/text tokens, typography helpers like `.title-h*`, `.paragraph-*`) over hard-coded values.
- Keep new colors tied to existing `@theme` variables; if you need a new token, add it once to the token files instead of inlining hex/rgb.
- Reuse the global motion/gradient utilities defined in `src/index.css` (`flowing-gradient`, `animate-*`) before adding bespoke animation code.
- Maintain safe-area spacing with `safe-top`, `safe-bottom`, `safe-full`, and the `.iphone-container` sizing; don’t introduce layout shifts that break the fixed viewport assumptions.

## Data, services, and state
- Auth, session lifecycle, intro state, and account selection flow through `SessionContext`; consult its state machine before adding duplicate flags or local storage usage.
- For API access, call the service modules (`auth`, `metaAuth`, `metaAds`, `accountService`) which wrap `apiFetch` and manage session headers/caching; don’t sprinkle raw `fetch` with ad-hoc URLs.
- Account discovery is centralized in `accountService` (with caching and Google Ads/GA4 pairing); extend it instead of building new fetchers.
- When adding new flows, ensure `hasSeenIntro`, `isAuthenticated`, `isMetaAuthenticated`, and `selectedAccount` stay in sync with `localStorage` rules already enforced by the context and services.

## Auth and routing
- Routing is handled inside `App.tsx` with an internal `appState` state machine (intro → auth → account selection → integrations → analysis pages). Respect those transitions and reuse the existing handlers (`handleAuthSuccess`, question click handlers) instead of adding competing navigation logic.
- Keep OAuth flows inside the existing popup/polling approach (`services/auth.ts` and `SessionContext` login/loginMeta). If you need backend endpoints, add them to the services first so they stay consistent with session headers.

## Implementation workflow
1) Read the relevant screen/component in `src/components` plus the supporting service/context before changing flow logic.
2) If you truly need recent context, briefly skim `CHANGELOG.md` to understand prior changes; otherwise avoid unnecessary edits to it beyond the required per-prompt entry.
3) Check the token files and `src/index.css` for existing utilities before adding styles; keep new utilities centralized.
4) Extend service modules or `SessionContext` rather than introducing new global stores or direct fetches.
5) Validate UI changes with the current mobile viewport assumptions (fixed height, safe areas, gradients).
6) Run `npm run lint` or `npm run test` when changing logic/JSX.
7) After verifying changes (tests and manual checks), update `CHANGELOG.md` (the log of agent changes across threads): append a new entry for every prompt—even on the same day or within the same thread since the version captures differences—place it at the top of the entries list, and leave older entries intact; only amend a prior entry when you are continuing the exact same fix/issue within the same thread.
8) Do not create additional `.md` files unless the user explicitly requests them; `CHANGELOG.md` updates are the exception.

## Do’s
- Reuse `useSession` state and handlers for auth/account changes; update the service layer if you need new backend calls.
- Keep styling semantic and token-based; lean on existing typography and animation helpers.
- Preserve mobile-first layouts, safe-area padding, and preload patterns used in `App.tsx`/`index.css`.
- Keep diffs narrow; extract subcomponents when JSX mixes presentation with service calls.
- Keep `CHANGELOG.md` current after each verified change; append for every prompt (date overlaps and same-thread prompts are fine because the version differentiates), place new entries at the top, and never delete or rewrite earlier entries—only amend an existing one when iterating on the same task in the same thread.
- Avoid introducing new Markdown docs (other than `CHANGELOG.md`) unless the user asks for them.

## Don’ts
- Don’t bypass `apiFetch`/service modules with raw `fetch` or hard-coded URLs.
- Don’t add new state libraries or global stores; extend `SessionContext` first.
- Don’t hard-code colors/spacing/fonts; map to theme tokens instead of inline values.
- Don’t reintroduce Tailwind/PostCSS configs or new UI kits without approval.
- Don’t introduce routing/state machines that conflict with the existing `appState` flow.

## Quick references
- Entry/layout: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- State: `src/contexts/SessionContext.tsx`
- Services/API: `src/services/auth.ts`, `src/services/metaAuth.ts`, `src/services/metaAds.ts`, `src/services/accountService.ts`, `src/utils/api.ts`
- Styles/tokens: `src/styles/colors-primitive.css`, `src/styles/colors-token.css`, `src/styles/colors-utility.css`, `src/styles/spac-primitive.css`, `src/styles/tokens.css`
