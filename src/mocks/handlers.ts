/**
 * MSW request handlers for MOCK_MODE.
 *
 * Strategy: explicit handlers for the auth/session/account/workspace endpoints
 * the shell touches, then a catch-all that answers any other /api/* call with a
 * benign empty payload so no page hits the network or throws on a failed fetch.
 *
 * Pages that need richer demo content get their own handler added below — grow
 * this list iteratively (run `npm run dev:mock`, open a page, watch the console
 * for "[MSW] unhandled-shape" warnings, add a fixture). See COLOR_OVERHAUL_PLAN §4.
 */
import { http, HttpResponse } from 'msw'
import { mockAccounts, mockWorkspaces, mockUser, MOCK_SESSION_ID } from './fixtures'

const ok = (body: unknown) => HttpResponse.json(body as Record<string, unknown>)

export const handlers = [
  // --- Session / auth ---------------------------------------------------------
  // /api/session/validate must always 200 with {valid:true} so the api.ts
  // logout-guard never fires and the seeded session is treated as live.
  http.get('*/api/session/validate', () =>
    ok({
      valid: true,
      user: {
        user_id: mockUser.google_user_id,
        name: mockUser.name,
        email: mockUser.email,
        picture_url: mockUser.picture_url,
        has_seen_intro: true,
        onboarding_completed: true,
      },
      selected_account: { id: mockAccounts[0].id },
      user_authenticated: { google: true, meta: true },
      platforms: { google: true, meta: true },
    })
  ),

  http.get('*/api/accounts*', () => ok(mockAccounts)),
  http.get('*/api/tenants', () => ok(mockWorkspaces)),
  http.get('*/api/tenants/current', () =>
    ok({ tenant: { id: mockWorkspaces[0].tenant_id, ...mockWorkspaces[0] } })
  ),

  // --- Global shell components ------------------------------------------------
  // The WhatsApp alert modal renders whenever /my-latest returns a body. A 200 {}
  // from the catch-all looks like a real (malformed) alert and crashes the shell,
  // so return 404 = "no active alert" and the modal stays closed.
  http.get('*/api/whatsapp-alerts/my-latest', () => new HttpResponse(null, { status: 404 })),

  // --- Catch-alls (must stay LAST) -------------------------------------------
  http.get('*/api/*', () => ok({})),
  http.post('*/api/*', () => ok({})),
  http.put('*/api/*', () => ok({})),
  http.patch('*/api/*', () => ok({})),
  http.delete('*/api/*', () => ok({})),
]

export { MOCK_SESSION_ID }
