# Theme Editor + Editable Components

**Status:** Jun 25 2026 · branch `color-overhaul` (mia-frontend)
**Live demo (public, no login):** https://mia-color-preview-joshs-projects-6429b69e.vercel.app
(stable alias — always points to the latest deploy)

## What this is
A credential-free mock build of MIA hosted on Vercel so the lead designer can
review the new brand palette across every page (light + dark) **and recolour it
himself, live, with no code**, via a floating 🎨 **Theme editor** panel (mock
build only — stripped from production).

How it works: the app is ~90% driven by CSS custom properties. The editor
regenerates a colour's 50–950 ramp in the browser (or sets a token directly) and
writes the CSS variables on `:root`, so the whole app recolours instantly. Each
control offers the **12 brand swatches + a hex field + a native picker**.
"Export" copies the chosen values as JSON to hand back to us.

## Currently editable (live in the panel)
**Colour roles** (regenerate full ramps): Brand/primary · Success · Warning · Error · Info
**Backgrounds / surfaces** (set directly, independently):
- Page background (the cream/ink canvas)
- Card surface (content cards)
- Sidebar (left nav)
- Top bar (breadcrumb/header strip)
- Chat box (the "Start chatting…" input)
- Panel / hover
- Borders (sets all three border tokens at once)

All apply to both light and dark — toggle the theme in the sidebar to check both.

## Proposed — "what else we can make editable" (next round)
Each needs a little wiring (give the element a dedicated CSS var, then add a
control). Rough effort noted.

| Component | What it is | Notes / effort |
|-----------|-----------|----------------|
| **Phase tags** | `01 Awareness` / `Engagement` / `Conversion` / `Loyalty` badges | Currently fixed hues in `phase-roles.ts` (JS) → convert to 4 CSS vars. Small. |
| **Status badges** | `complete` / `generating` / live pills | Currently tied to Success/Warning tokens → give dedicated vars so they're separate. Small. |
| **Chat bubbles** | user vs Mia message backgrounds | Two vars on the chat message components. Small. |
| **Segmented toggles** | `Monthly / Whole campaign`, `Auto / Light / Dark` pills | Active-segment background var. Small–med. |
| **Active nav highlight** | selected sidebar item background | One var on the nav item active state. Small. |
| **Metric / KPI accents** | the big numbers / accent text on cards | Decide if these follow Brand or a separate accent var. Small. |
| **Channel / chart colours** | the 18 channel hues on charts/calendar | Already remapped on-palette in `channel-colors.ts` + `--cw-channel-*`; could expose a "Chart colours" section (long list). Medium. |

## Implementation notes (for whoever continues this)
- Editor component: `src/mocks/theme-editor.tsx` (MOCK_MODE only; lazy + flag-gated in `main.tsx`, tree-shaken from prod — verified).
- Adding a new editable surface = (1) give the element a dedicated CSS var with a
  sensible default in `color-tokens.css` (light) + `dark-theme.css` (dark), (2)
  point the component's class at `bg-[var(--ui-x)]`, (3) add an entry to the
  `SURFACES` array in `theme-editor.tsx`. (See sidebar/top-bar/chat for the pattern.)
- A control can write multiple vars at once (see the Borders entry's `vars: [...]`).
- Ramp-based roles regenerate 50–950 via HSL; surfaces set the token directly.
- Hardcoded (not yet var-driven, so not live-editable): `phase-roles.ts`,
  `channel-colors.ts`. These were remapped to the new palette but need
  var-ification to be editable in the panel.

## Deploy (CLI only — free account's git deploy is reserved for the live app)
```
npm run build:mock                      # bakes VITE_USE_MOCKS=true (MSW + editor)
# copy dist/ to a standalone dir, add vercel.json with SPA rewrites, then:
vercel deploy --prod --yes              # project: mia-color-preview (separate from live app)
```
Deployment protection (SSO) is disabled on the project so the link is public.
