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
The panel is organised into **collapsible groups, most-important first** (Brand &
theme open by default). Each control = 12 brand swatches + hex field + picker.

- **Brand & theme** — Brand/primary · Page background · Card surface · Sidebar · Top bar · Active nav item · Panel/hover · Borders
- **Status colours** — Success · Warning · Error · Info
- **Chat & home** — Chat box · Chat bubble (you) · Chat bubble (Mia)
- **Campaigns** — Phase tags: Awareness · Engagement · Conversion · Loyalty
- **Metrics & KPI** — KPI/metric numbers (the big figures on budget + campaign cards)

All apply to both light and dark — toggle the theme in the sidebar to check both.
Already covered implicitly: **status badges** (follow Success/Warning) and
**segmented toggles** (follow Brand).

## Done since first draft
Phase tags ✅ · chat bubbles ✅ · active nav ✅ · metric/KPI numbers ✅ · grouped
+ collapsible + page-split editor ✅. Status badges + segmented toggles confirmed
already-covered (follow Success/Warning + Brand).

## Still proposed — "what else" (remaining)
| Component | What it is | Notes / effort |
|-----------|-----------|----------------|
| **Channel / chart colours** | the 18 channel hues on charts/calendar/budget bars | Already remapped on-palette (`channel-colors.ts` + `--cw-channel-*`); to make live-editable, expose a "Chart colours" group (18 controls) and route the hues through CSS vars. Medium. |
| **Mia Intelligence / accent panels** | tinted info panels (e.g. budget recommendation box) | Currently brand-tinted; could get a dedicated accent var. Small. |
| **Insight card accents** | per-section insight highlights | Small. |

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
