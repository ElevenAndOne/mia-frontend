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
