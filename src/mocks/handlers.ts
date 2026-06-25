/**
 * MSW request handlers for MOCK_MODE.
 *
 * Order matters: more specific paths first, catch-alls LAST. MSW matches in
 * array order, and `:param` segments will greedily match literal sub-paths
 * (e.g. `/campaigns/:id` would swallow `/campaigns/hubspot-lists`), so the
 * literal sub-routes are registered before the `:id` route.
 *
 * Grow this list iteratively: run `npm run dev:mock`, open a page, watch the
 * console for crashes, add a fixture. See docs/COLOR_OVERHAUL_PLAN.md §4/§8.
 */
import { http, HttpResponse } from 'msw'
import { mockAccounts, mockWorkspaces, mockUser } from './fixtures'
import { campaignSummary, campaignDetail } from './campaign'
import { budgetSnapshot, budgetRecommendation } from './budget'
import {
  reportSummaries,
  reportCampaignOptions,
  accountsAvailable,
  integrationsStatus,
  insightsSummary,
  insightStreams,
} from './pages'

const json = (body: unknown) => HttpResponse.json(body as Record<string, unknown>)

// Build a text/event-stream Response the quick-insights reader can consume:
// `data: {json}\n\n` events, ending with `{done:true}`.
function sseStream(markdown: string) {
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: markdown })}\n\n`))
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      controller.close()
    },
  })
  return new HttpResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}

export const handlers = [
  // --- Session / auth ---------------------------------------------------------
  http.get('*/api/session/validate', () =>
    json({
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

  // --- Integrations -----------------------------------------------------------
  http.get('*/api/accounts/available', () => json(accountsAvailable)),
  http.get('*/api/tenants/:tenantId/integrations', () => json(integrationsStatus)),

  // --- Campaigns: literal sub-routes BEFORE :campaignId -----------------------
  http.get('*/api/tenants/:tenantId/campaigns/hubspot-lists', () =>
    json({
      lists: [
        { list_id: 'hs_1', id: 'hs_1', name: 'Newsletter — Active', size: 18400 },
        { list_id: 'hs_2', id: 'hs_2', name: 'Launch waitlist', size: 2650 },
      ],
    })
  ),
  http.get('*/api/tenants/:tenantId/campaigns/brevo-lists', () =>
    json({
      lists: [
        { list_id: 'bv_1', id: 'bv_1', name: 'Welcome flow', size: 3900 },
        { list_id: 'bv_2', id: 'bv_2', name: 'Cold Brew launch', size: 12100 },
      ],
    })
  ),
  http.get('*/api/tenants/:tenantId/campaigns/platform-campaigns', () => json({ campaigns: [] })),
  // /campaigns/tracker (strategise) — return a campaign with RACE phases
  http.get('*/api/tenants/:tenantId/campaigns/tracker', () =>
    json({
      campaign: {
        campaign_id: campaignDetail.campaign_id,
        campaign_name: campaignDetail.campaign_name,
        client_name: campaignDetail.client_name,
        budget_total: campaignDetail.budget_total,
        budget_currency: campaignDetail.budget_currency,
        phases: campaignDetail.phases.map((p) => ({
          phase_id: p.phase_id,
          phase_name: p.phase_name,
          sort_order: p.sort_order,
          kpis: p.kpis.map((k) => ({ kpi_id: k.kpi_id, kpi_name: k.kpi_name, target_numeric: k.target_numeric })),
        })),
      },
    })
  ),
  // List (trailing slash)
  http.get('*/api/tenants/:tenantId/campaigns/', () => json([campaignSummary])),
  http.get('*/api/tenants/:tenantId/campaigns', () => json([campaignSummary])),
  // Detail by id
  http.get('*/api/tenants/:tenantId/campaigns/:campaignId', () => json(campaignDetail)),
  // Channel config
  http.get('*/api/tenants/:tenantId/channel-config', () => json({ hidden: [], custom: [] })),

  // --- Budget tracker ---------------------------------------------------------
  http.get('*/api/tenants/:tenantId/budget-tracker/:campaignId', () => json(budgetSnapshot)),
  http.post('*/api/tenants/:tenantId/budget-tracker/:campaignId/recommendation', () =>
    json(budgetRecommendation)
  ),

  // --- Reports ----------------------------------------------------------------
  http.get('*/api/tenants/:tenantId/reports', () => json(reportSummaries)),
  http.get('*/api/tenants/:tenantId/reports/clickup/spaces', () => json({ spaces: [] })),

  // --- Strategise / optimizer -------------------------------------------------
  http.get('*/api/tenants/:tenantId/optimizer/runs', () => json([])),

  // --- Reports campaign options (also served by the generic list above) -------
  // (kept explicit in case the path differs in future)
  http.get('*/api/tenants/:tenantId/report-campaigns', () => json(reportCampaignOptions)),

  // --- Quick insights ---------------------------------------------------------
  http.post('*/api/quick-insights/summary', () => json(insightsSummary)),
  http.post('*/api/quick-insights/grow/stream', () => sseStream(insightStreams.grow)),
  http.post('*/api/quick-insights/optimize/stream', () => sseStream(insightStreams.optimize)),
  http.post('*/api/quick-insights/protect/stream', () => sseStream(insightStreams.protect)),

  // --- Onboarding -------------------------------------------------------------
  http.get('*/api/onboarding/status', () =>
    json({
      step: 5,
      completed: true,
      platforms_connected: ['google_ads', 'ga4', 'meta_ads', 'hubspot', 'brevo'],
      platform_count: 5,
      full_access: true,
      bronze_ready: true,
      grow_task_id: null,
    })
  ),

  // --- Workspace / accounts ---------------------------------------------------
  http.get('*/api/accounts*', () => json(mockAccounts)),
  http.get('*/api/tenants', () => json(mockWorkspaces)),
  http.get('*/api/tenants/current', () =>
    json({ tenant: { id: mockWorkspaces[0].tenant_id, ...mockWorkspaces[0] } })
  ),

  // --- Global shell components ------------------------------------------------
  // WhatsApp alert modal: 404 = "no active alert" so the modal stays closed.
  http.get('*/api/whatsapp-alerts/my-latest', () => new HttpResponse(null, { status: 404 })),

  // --- Catch-alls (must stay LAST) -------------------------------------------
  http.get('*/api/*', () => json({})),
  http.post('*/api/*', () => json({})),
  http.put('*/api/*', () => json({})),
  http.patch('*/api/*', () => json({})),
  http.delete('*/api/*', () => json({})),
]
