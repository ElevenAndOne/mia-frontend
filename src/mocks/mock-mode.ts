/**
 * Mock-mode flag — the single switch for the credential-free design-preview build.
 *
 * `__USE_MOCKS__` is replaced at build time by a string literal via Vite's
 * `define` (see vite.config.ts). It is 'true' only under `npm run dev:mock` /
 * `build:mock`; every normal/production build folds it to 'false', so Rollup
 * statically drops all mock code paths (incl. the MSW chunk) from the bundle and
 * the real app is completely unaffected.
 *
 * Purpose: let the lead designer review every page's look (light + dark) on a
 * hosted build without any login, credentials, or backend. See
 * docs/COLOR_OVERHAUL_PLAN.md §4.
 */
declare const __USE_MOCKS__: string

export const MOCK_MODE = __USE_MOCKS__ === 'true'
