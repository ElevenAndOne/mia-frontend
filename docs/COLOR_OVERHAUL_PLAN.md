# MIA Color Overhaul — Research & Plan

**Status:** Planning (no code yet)
**Date:** 2026-06-24
**Repos:** `mia-frontend` (all the work), `mia-backend` (Figma extraction script only)
**Goal:** Replace MIA's purple-anchored palette with the lead designer's new brand palette, across **both light and dark themes**, and give the designer a credential-free way to review every page before we commit.

---

## 1. Why this is tractable

The frontend already uses a **4-tier token pipeline** on Tailwind v4 `@theme`. ~90% of the app reads color through tokens, so a recolor is mostly editing a few CSS files — **not** touching 172 components.

| Tier | File | What it holds |
|------|------|---------------|
| 1 — Primitives | `src/styles/color-primitives.css` | ~130 raw hexes, 12 hue scales (50–950). Brand = `--color-purple-500: #6b51ef` |
| 2 — Semantic tokens | `src/styles/color-tokens.css` | Role names: `text-*`, `background-*`, `border-*` → reference primitives via `var()` |
| 3 — Utility scale | `src/styles/color-utility.css` | 11-hue `utility-*` scale; **inverts in dark mode** |
| 4 — Class names | `src/styles/property-utilities.css` | `.bg-brand-solid`, `.text-primary` etc. — what components actually use |
| Dark mode | `src/styles/dark-theme.css` | Single `:root.dark` override; components never change |

**Recolor = edit Tier 1 + Tier 2 (+ dark overrides).** Components are untouched.

### The ~10% that is NOT tokenized (must be handled explicitly)
- `src/features/campaigns/utils/channel-colors.ts` — chart/channel/asset hexes via helper fns (`channelColor()`, `softColor()`). One isolated file. **Good candidate to re-map onto the new accent palette.**
- **Platform brand colors** — LinkedIn `#0A66C2`, Google (`#4285F4` etc.), ClickUp `#7B68EE`. **Keep these** — intentional 3rd-party branding, not ours to recolor.
- One-offs: pulse-gold `rgba(212,175,55,…)`, campaign avatar `#df6a1f`, Mia-circle gradient (`--mia-outer: var(--color-utility-warning-400)`), iPhone shadow. Audit individually.

---

## 2. New palette — source of truth

**Figma file:** `Mia - Brand Development` (key `Q5K3d9qECYkQldw4iozPQq`, node `2636-190`).
**Extraction:** `mia-backend/scripts/figma_design_dna.py "<url>" --token figd_xxx` (read-only PAT, scope `file_content:read`). Outputs exact named styles + ranked palette to `/tmp/figma_design_dna_<key>.json`.

### The 12 swatches — EXACT (pulled from Figma file `Q5K3d9qECYkQldw4iozPQq`, Landing Page 2026)

| Swatch | Hex | Likely role |
|--------|-----|-------------|
| Raspberry | `#C54966` | accent / error candidate |
| Golden | `#F4C247` | warning candidate |
| Peach | `#FFBE98` | accent / warning-subtle |
| Sage/Olive | `#BABC72` | success candidate / accent |
| Periwinkle | `#8398CA` | info / accent |
| Petrol-Teal | `#007A9B` | **brand-primary candidate** |
| Cream | `#F0EEE9` | **light background** |
| Rose | `#E499BA` | accent |
| Mauve | `#9F8286` | neutral-accent |
| Terracotta | `#E15D44` | **brand-primary candidate** / error |
| Ink/Navy | `#0E131A` | **dark background / text** |
| Turquoise | `#44B8AB` | success candidate / accent |

**Tints/shades the designer has already used** (useful starting points for ramp generation):
peach `#F69256` (mid) · `#FFDFCC` (light) · sage `#DCDE8C` (light) · raspberry `#E38691` (light) ·
teal `#9DC6D8` (light) / `#1985A0` `#00786E` (dark) · turquoise `#7DD0B6` (light) · ink `#040B1D` `#151A22` (deeper).

### Applied scheme observed on the live landing-page design (the real "in-context" usage)
This is how the designer is actually *using* the palette — strong signal for token mapping:
- **Dark sections:** bg `#040B1D` / `#0E131A` (ink), headings `#ECEEF7` (White Lilac), body `#8C93B0` (Bali Hai), muted `#5A6188` (Waikawa Gray).
- **Light sections:** bg `#F6F1DD` / `#F0EEE9` (cream), dark text `#040B1D`.
- **Hero accents:** petrol-teal `#007A9B`, golden stars `#F4C247`, peach `#FFBE98`.
- **`#79F6FF` (bright cyan, style "Anakiwa") — NOT a brand candidate.** It is NOT on the 12-swatch palette board; it only appears as a landing-page hero accent (compass labels "N·000", "Emphasis →" highlight phrases, a glow rectangle). The brand primary will be one of the 12 — most likely **petrol-teal `#007A9B`** or **terracotta `#E15D44`**.

### ⚠️ Type system also changes (heads-up, out of scope for color work)
The new design uses **Bricolage Grotesque** (headings), **Instrument Serif** (emphasis), **JetBrains Mono** (labels), **Inter** (body). Current app loads Geologica / Figtree / Hanken Grotesque / JetBrains Mono. A font swap is a separate workstream — flag for the designer; not part of this color plan.

### Open design decisions (designer's call — see §7)
1. **Brand anchor** (replaces purple `#6b51ef`): petrol-teal or terracotta are strongest. This drives every `*-brand-*` token + primary buttons.
2. **Semantic mapping:** error / warning / success / info → which hues? (e.g. error→raspberry, warning→golden, success→turquoise, info→periwinkle.)
3. **Neutrals:** cream = light bg, ink-navy = dark bg/text — maps cleanly. Need a full neutral ramp (50–950) derived from these.
4. **Single-shade problem:** each swatch is ONE shade. We must generate full 50–950 ramps per hue (tints toward white, shades toward ink) so existing token references (e.g. `purple-50`, `purple-900`) have equivalents.

---

## 3. Mapping strategy

### Phase A — Generate ramps
For each chosen hue, generate a 50–950 scale from the single brand shade (algorithmic tint/shade, then hand-tune mid-tones for WCAG contrast). Tooling: a small script (e.g. chroma.js / culori) or Tailwind palette generator; designer signs off on the ramps.

### Phase B — Rewrite Tier 1 primitives (`color-primitives.css`)
- Replace the purple scale with the new **brand** scale.
- Add/replace semantic hue scales (red→error hue, green→success hue, etc.) OR keep names and re-point values. **Decision:** prefer **re-pointing values under existing names** to minimize Tier-2 churn (e.g. keep `--color-purple-500` as the variable name but document it's now brand-teal) — OR rename for clarity and update Tier 2. Recommend renaming to neutral semantic names (`brand-*`) to avoid "purple means teal" confusion long-term.
- Replace gray/slate neutrals with cream-light + ink-navy-dark neutral ramps.

### Phase C — Re-map Tier 2 semantic tokens (`color-tokens.css` + `dark-theme.css`)
- `--color-background-brand-solid`, `--color-text-brand-*`, `--color-border-brand` → new brand ramp.
- `text/background/border-error|warning|success` → new semantic hues, **both** light and dark.
- `--color-background-primary/secondary/...` → cream-based light, ink-navy-based dark.
- Verify the dark-mode utility inversion (`color-utility.css` reversal) still reads well with new hues.

### Phase D — De-tokenized exceptions
- Re-map `channel-colors.ts` onto the new 12-accent palette (great fit — 12 swatches ≈ channel count).
- Audit one-offs (pulse-gold, `#df6a1f`, Mia gradient) → token or replace.
- Leave platform brand colors as-is.

### Phase E — Logo / illustration / gradient assets
- Mia-circle gradient, any SVGs/illustrations with baked-in purple, favicon, OG images. Inventory separately (not CSS tokens).

---

## 4. Designer review pipeline (credential-free, all pages, both themes)

**Requirement (confirmed):** designer needs to *see the UI look of every page* in light + dark. **Page flows / interactivity are NOT required.**

Given that, interactivity is a non-goal, so we keep mock data dead-simple (GET fixtures only, no mutations).

### Recommended: "mock render mode" → Playwright screenshot gallery (primary) + optional Vercel preview

1. **Mock render mode** (the shared foundation):
   - Wire the existing **unused `VITE_USE_MOCKS` flag** → **MSW (Mock Service Worker)** to intercept `apiFetch()` and return seeded fixtures.
   - Bypass auth gating in mock mode: short-circuit `ProtectedRoute` + seed a mock session/account/workspace in `SessionProvider`.
   - One realistic fixture set (one workspace, a few campaigns, sample insights/reports) is enough — every page renders.

2. **Playwright screenshot gallery** (primary review surface):
   - Drive the mock app, visit all ~22 routes, capture each in **light + dark**.
   - Output a static gallery (HTML grid, or an Artifact) — designer scans every page, annotates color changes. Exactly "view all the pages," lowest friction.
   - Reuse later as **visual-regression baseline**: re-shoot after recolor, diff for contrast/legibility breakage.

3. **Optional — host the live mock app on Vercel:** lets the designer poke at hover/responsive states. Nice-to-have; the gallery already satisfies the stated need.

### Why not a full hand-stubbed fork
Stubbing `SessionProvider` + every React Query hook by hand across 22 pages is more invasive and harder to keep in sync. MSW intercepts at the network boundary, so components/hooks run unmodified — closer to real, less code.

### Routes to capture (~22)
Public: `/`, `/invite/:id`, `/report-print`
Core: `/home` (chat), `/integrations`, `/help`
Campaigns: `/campaigns`, `/campaigns/new`, `/campaigns/:id/{overview,calendar,builder}`
Insights: `/insights/{grow,optimize,protect,summary,strategise}`
Reporting: `/reports`, `/predict`, `/budget-tracker`, `/creative-studio`
Settings: `/settings/workspace`, `/onboarding`
Plus mobile-nav variants if the designer wants mobile.

---

## 5. Verification

- **Visual regression:** Playwright baseline (before) vs after — flags every changed pixel; reviewer confirms intentional.
- **Contrast / a11y:** run an automated contrast check (axe / pa11y) on text-on-background token pairs in both themes; the new ramps must hit WCAG AA. Mid-tone hand-tuning in Phase A is where this is won.
- **Build gates:** `npm run build` (tsc -b + vite build) must stay green — unused vars are hard errors on Vercel. Token renames must update all references.

---

## 6. Phasing & sequencing

| Step | Output | Blocks on |
|------|--------|-----------|
| 0 | Exact palette JSON from Figma | PAT (user) |
| 1 | Designer-approved 50–950 ramps + role assignments | exact palette + designer |
| 2 | Mock render mode (MSW + auth bypass) | — (can start now, parallel) |
| 3 | Playwright screenshot gallery of current app (baseline) | step 2 |
| 4 | Recolor Tier 1 + Tier 2 + dark overrides | step 1 |
| 5 | De-tokenized exceptions (channel-colors, one-offs, assets) | step 4 |
| 6 | After-screenshots + visual regression + contrast audit | steps 3, 4 |
| 7 | Designer sign-off → merge | step 6 |

Steps 2–3 (the review harness) are **independent of the palette** and can be built first so the gallery is ready the moment the recolor lands.

---

## 7. Open questions for the designer (sent to Josh — Jun 24)

Plain-English version Josh is taking to the designer:
1. **Primary brand color** — which of the 12 replaces purple (buttons / links / highlights)? Likely petrol-teal `#007A9B` or terracotta `#E15D44`.
2. **Status colors** — which swatch means **success** (good/up), which means **warning** (caution), which means **error** (bad/down)?
3. **Dark mode** — confirm it stays in and uses **ink-navy `#0E131A`** as the dark background.
4. **Fonts final?** Bricolage Grotesque (headings) · Instrument Serif (emphasis) · JetBrains Mono (labels) · Inter (body).
5. **Shades** — does he supply lighter/darker steps per color, or do we generate ~10-step ramps (50–950) and hand-tune for WCAG contrast?
6. **Logo / app icon** — new versions in the new colors coming, or recolor the existing one?

(Implied/our default: re-map `channel-colors.ts` chart colors onto the new 12 accents; keep 3rd-party platform brand colors as-is.)

---

## 8. Current status & where to pick up (Jun 24, 2026)

**Done:** research + this plan; exact palette extracted from Figma; **mock preview harness BUILT & PROVEN** — all 20 routes render in light + dark, credential-free.

**Harness usage** (port **5180**, kept off 5173 so it never clashes with the real frontend dev server):
- `npm run dev:mock` → open http://localhost:5180/home (no login; demo "Northwind Coffee" data)
- Screenshot gallery: once `npx playwright install chromium`, with dev:mock running → `PREVIEW_URL=http://localhost:5180 npm run screenshots` → open `screenshots/index.html`
- Fixtures now cover: campaigns (rich RACE), budget-tracker, reports, integrations status, insights (grow/optimize/protect streamed + summary). Thin/empty still: strategise (needs optimizer-run fixture), onboarding.
- Normal `npm run build` is unaffected (MSW fully tree-shaken out; verified). All mock code gated by `VITE_USE_MOCKS` / `__USE_MOCKS__`.

**Not started:** the recolor itself (gated on §7 answers — primary color is the key unlock).

**Next steps:**
1. Fill MSW fixtures so data pages look full (campaign detail needs a fixture matching id `mock_campaign_1`; campaigns list, the 5 insights, reports, budget-tracker render empty today). Add fixture → re-capture.
2. (Optional) Host the mock build on Vercel for a private designer link (`build:mock` + set `VITE_USE_MOCKS=true`).
3. Once primary + status colors are known: recolor Tier 1 primitives + Tier 2 tokens + dark overrides, remap `channel-colors.ts`, then re-capture for before/after.

**Note:** branch `color-overhaul` has uncommitted changes (per Josh's commit-when-asked workflow).
