/**
 * Misc page fixtures for MOCK_MODE: reports list, integration status,
 * and quick-insight content (summary + streamed grow/optimize/protect).
 */
import { CAMPAIGN_ID } from './campaign'

// --- Reports list (ReportSummary[]) ------------------------------------------
export const reportSummaries = [
  {
    report_id: 'rep_2026_05', campaign_id: CAMPAIGN_ID,
    period_start: '2026-05-01', period_end: '2026-05-31',
    report_month: 5, report_year: 2026, status: 'complete',
    client_name: 'Northwind Coffee Co.', campaign_name: 'Cold Brew Summer Launch',
    reporting_period_label: 'May 2026', created_at: '2026-06-02T08:00:00Z',
  },
  {
    report_id: 'rep_2026_06', campaign_id: CAMPAIGN_ID,
    period_start: '2026-06-01', period_end: '2026-06-30',
    report_month: 6, report_year: 2026, status: 'generating',
    client_name: 'Northwind Coffee Co.', campaign_name: 'Cold Brew Summer Launch',
    reporting_period_label: 'June 2026', created_at: '2026-06-25T08:00:00Z',
  },
]

export const reportCampaignOptions = [
  {
    campaign_id: CAMPAIGN_ID, campaign_name: 'Cold Brew Summer Launch',
    client_name: 'Northwind Coffee Co.', status: 'live',
    channels: ['meta_ads', 'google_ads', 'email', 'organic_social'], clickup_list_id: 'cu_list_demo',
  },
]

// --- Integrations (a realistic mix of connected vs not) ----------------------
export const accountsAvailable = {
  accounts: [
    {
      id: 'mock_acct_default', name: 'Northwind Coffee Co.',
      google_ads_id: '123-456-7890', meta_ads_id: 'act_1112223334',
      ga4_property_id: '987654321', hubspot_portal_id: '44550011',
      facebook_page_id: '555000111',
      linked_ga4_properties: [{ property_id: '987654321', display_name: 'Northwind GA4 — Web' }],
    },
  ],
  ga4_properties: [
    { property_id: '987654321', display_name: 'Northwind GA4 — Web' },
    { property_id: '987654322', display_name: 'Northwind GA4 — App' },
  ],
}

export const integrationsStatus = {
  platform_status: {
    google_ads: true, ga4: true, meta_ads: true, facebook_organic: true,
    brevo: true, hubspot: true, mailchimp: false, linkedin_ads: false,
    airtable: false, smartlead: false,
  },
}

// --- Insights: summary (plain JSON) ------------------------------------------
export const insightsSummary = {
  success: true,
  type: 'executive_summary',
  summary:
    'June is pacing well: the Cold Brew launch drove a 24% lift in DTC revenue vs last year, led by efficient Google Search (4.3x ROAS). Meta prospecting reach hit 91% of target but efficiency is tapering — a good moment to shift spend toward Search and retargeting. Email signups are ahead of plan (3,900 vs 3,500 target), building a strong base for the Convert phase.',
}

// --- Insights: streamed grow/optimize/protect content ------------------------
// The frontend parses [Title]:/[Insight]:/[Interpretation]:/[Action]: markers.
export const insightStreams: Record<string, string> = {
  grow: `[Title]: Search is your most efficient growth lever
[Insight]: Google Search delivered a 4.3x ROAS in June at $7.5K spend, ahead of the 4.0x target.
[Interpretation]: High-intent cold-brew queries are converting well and you're close to budget-capped on this campaign.
[Action]: Raise the Search daily budget ~10% and expand the non-brand keyword set before the July Convert phase.

[Title]: Email signups are outpacing plan
[Insight]: 3,900 signups vs a 3,500 target, with a 38% open rate on the welcome flow.
[Interpretation]: The launch offer is resonating and building a warm base for retargeting.
[Action]: Add a second welcome email featuring the best-selling blend to lift first-order conversion.`,

  optimize: `[Title]: Shift budget from Meta prospecting to Search
[Insight]: Meta reach hit 91% of target but CPM rose 18% in the last 7 days; Search remains capped and efficient.
[Interpretation]: Meta prospecting is past peak efficiency for the month while Search has unmet demand.
[Action]: Move ~$800 from Meta Reach to Google Search to protect blended ROAS.

[Title]: Consolidate underperforming ad sets
[Insight]: 3 of 7 Meta ad sets are below a 1.5x ROAS and fragmenting the budget.
[Interpretation]: Spreading spend thin is slowing the learning phase.
[Action]: Pause the bottom 3 ad sets and reallocate to the top carousel creative.`,

  protect: `[Title]: Google Ads is nearly budget-capped
[Insight]: Search has spent 94.5% of its June allocation with 5 days left.
[Interpretation]: You risk going dark on your most efficient channel before month end.
[Action]: Top up the Search budget by ~$440 or enable shared-budget borrowing from Meta.

[Title]: One creative is driving most of the fatigue
[Insight]: Frequency on the Hero Video has passed 4.1 with a declining CTR.
[Interpretation]: Audience fatigue is starting to inflate CPMs.
[Action]: Rotate in the Flavour Carousel as the primary prospecting creative this week.`,
}
