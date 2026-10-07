/**
 * Routes that authenticate themselves and must never be treated as part of the signed-in app.
 *
 * Each is opened by something that has no session and cannot get one: the backend's headless
 * Chromium renderer (/post-card, /report-print) or an invited person who hasn't signed up yet
 * (/invite/). They carry their own credential in the URL — a signed, short-lived,
 * single-resource token — so the session bootstrap, the auth redirects and the 401 "session
 * invalid" logout all skip them. One list, used by all three (2 Oct 2026: the card page ran
 * the normal bootstrap, got three 401s, and forceLogout sent the renderer to the sign-in page;
 * no WhatsApp post card rendered on live).
 */
export const STANDALONE_PATHS = ['/invite/', '/report-print', '/post-card'] as const

export const isStandalonePath = (path: string): boolean =>
  STANDALONE_PATHS.some((p) => path === p || path.startsWith(p))

/**
 * The pages the backend's headless renderer opens: no session, ever, so the session bootstrap
 * (OAuth return, validation, workspace fetches) is skipped on them.
 *
 * /invite/ is NOT one of these (7 Oct 2026). It is standalone for redirects and logout, but an
 * invited person signs in ON that page: Google sends them back to /invite/<id>?claim=..., and
 * only the bootstrap redeems that claim. Skipping it there (2 Oct) left every invite on
 * "Sign In to Accept" forever, signed in or not.
 */
export const RENDERER_PATHS = ['/report-print', '/post-card'] as const

export const isRendererPath = (path: string): boolean =>
  RENDERER_PATHS.some((p) => path === p || path.startsWith(p))
