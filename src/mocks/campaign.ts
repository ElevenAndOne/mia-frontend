/**
 * Rich demo campaign fixture for MOCK_MODE — a mid-flight, multi-channel RACE
 * campaign so the /campaigns overview, calendar and builder all render with
 * real-looking content. "Today" for the demo is ~late June 2026, so the
 * campaign (May–Jul) is mid-flight.
 *
 * Shapes match the CampaignSummary / CampaignDetail interfaces in
 * src/features/campaigns/campaigns-view.tsx.
 */

export const CAMPAIGN_ID = 'cmp_northwind_spring_2026000001'
const TENANT = 'mock_tenant_1'

export const campaignSummary = {
  campaign_id: CAMPAIGN_ID,
  campaign_name: 'Cold Brew Summer Launch',
  client_name: 'Northwind Coffee Co.',
  status: 'live',
  is_primary: true,
  channels: ['meta_ads', 'google_ads', 'email', 'organic_social'],
  budget_total: 48000,
  budget_currency: 'USD',
  start_date: '2026-05-01',
  end_date: '2026-07-31',
  clickup_list_id: 'cu_list_demo',
}

export const campaignDetail = {
  campaign_id: CAMPAIGN_ID,
  campaign_name: 'Cold Brew Summer Launch',
  client_name: 'Northwind Coffee Co.',
  status: 'live',
  is_primary: true,
  start_date: '2026-05-01',
  end_date: '2026-07-31',
  budget_total: 48000,
  budget_monthly: 16000,
  budget_currency: 'USD',
  channels: ['meta_ads', 'google_ads', 'email', 'organic_social'],
  utm_campaign: 'coldbrew_summer_2026',
  platform_filter: null,
  google_ads_filter: null,
  meta_filter: null,
  brevo_filter: null,
  clickup_list_id: 'cu_list_demo',
  campaign_guide_id: null,
  objectives: [
    'Launch the new Cold Brew range to existing and lapsed customers',
    'Grow summer DTC revenue 25% vs last year',
    'Build a warm audience for the autumn seasonal push',
  ],
  phases: [
    {
      phase_id: 'ph_reach_0001',
      phase_name: 'Reach',
      sort_order: 0,
      objective: 'Maximise awareness of the Cold Brew launch',
      strategy: 'Broad video + carousel prospecting across Meta and YouTube',
      start_date: '2026-05-01',
      end_date: '2026-05-31',
      kpis: [
        { kpi_id: 1, kpi_name: 'Reach', target_value: '850K', target_numeric: 850000, unit: 'people', sort_order: 0 },
        { kpi_id: 2, kpi_name: 'CPM', target_value: '$9.50', target_numeric: 9.5, unit: 'USD', sort_order: 1 },
      ],
      channel_actions: [
        {
          action_id: 'act_reach_meta',
          channel: 'meta_ads',
          objective: 'Prospecting reach',
          strategy: 'Lookalike + broad interest, video-first creative',
          action_notes: 'Daily budget ~$280. Feed + Reels + Stories placements.',
          budget: 9000,
          budget_period: 'total',
          start_date: '2026-05-01',
          end_date: '2026-05-31',
          linked_platform_campaigns: [
            { id: 'meta_cmp_8841', name: 'Northwind — Cold Brew — Reach', status: 'ACTIVE' },
          ],
          assets: [
            {
              asset_id: 'ast_reach_video', asset_name: 'Cold Brew Hero Video (15s)', asset_type: 'video',
              key_message: 'Slow-steeped, never bitter', cta: 'Discover the range',
              details: { optimal_post_time: 'Thu 18:00' }, sort_order: 0,
              budget: 5000, budget_period: 'total', start_date: '2026-05-01', end_date: '2026-05-18',
            },
            {
              asset_id: 'ast_reach_carousel', asset_name: 'Flavour Carousel', asset_type: 'carousel',
              key_message: 'Four ways to cold brew', cta: 'Shop the range',
              details: null, sort_order: 1,
              budget: 4000, budget_period: 'total', start_date: '2026-05-12', end_date: '2026-05-31',
            },
          ],
        },
        {
          action_id: 'act_reach_social',
          channel: 'organic_social',
          objective: 'Earned reach + social proof',
          strategy: '3x weekly Reels + UGC reposts',
          action_notes: null, budget: null, budget_period: null,
          start_date: '2026-05-01', end_date: '2026-05-31',
          linked_platform_campaigns: [],
          assets: [
            {
              asset_id: 'ast_reach_reel', asset_name: 'Behind-the-bar Reel series', asset_type: 'reel',
              key_message: 'Meet the roasters', cta: 'Follow for more',
              details: null, sort_order: 0, budget: null, budget_period: null,
              start_date: '2026-05-05', end_date: '2026-05-30',
            },
          ],
        },
      ],
    },
    {
      phase_id: 'ph_act_0002',
      phase_name: 'Act',
      sort_order: 1,
      objective: 'Drive consideration and site engagement',
      strategy: 'Retarget video viewers; capture email signups with a launch offer',
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      kpis: [
        { kpi_id: 3, kpi_name: 'Landing page views', target_value: '40K', target_numeric: 40000, unit: 'sessions', sort_order: 0 },
        { kpi_id: 4, kpi_name: 'Email signups', target_value: '3,500', target_numeric: 3500, unit: 'contacts', sort_order: 1 },
      ],
      channel_actions: [
        {
          action_id: 'act_act_google',
          channel: 'google_ads',
          objective: 'Capture high-intent search',
          strategy: 'Brand + cold brew non-brand search, sitelink to range page',
          action_notes: 'Target ROAS bidding once 30 conversions logged.',
          budget: 8000, budget_period: 'total',
          start_date: '2026-06-01', end_date: '2026-06-30',
          linked_platform_campaigns: [
            { id: 'gads_cmp_2207', name: 'Northwind — Search — Cold Brew', status: 'ENABLED' },
          ],
          assets: [
            {
              asset_id: 'ast_act_rsa', asset_name: 'Cold Brew RSA', asset_type: 'responsive_search_ad',
              key_message: 'Smooth cold brew, delivered', cta: 'Order today',
              details: null, sort_order: 0, budget: 8000, budget_period: 'total',
              start_date: '2026-06-01', end_date: '2026-06-30',
            },
          ],
        },
        {
          action_id: 'act_act_email',
          channel: 'email',
          objective: 'Convert signups to first order',
          strategy: '3-email welcome flow with launch discount',
          action_notes: null, budget: null, budget_period: null,
          start_date: '2026-06-05', end_date: '2026-06-30',
          linked_platform_campaigns: [],
          assets: [
            {
              asset_id: 'ast_act_email1', asset_name: 'Welcome — Meet Cold Brew', asset_type: 'email',
              key_message: 'Why slow-steeped wins', cta: 'Shop now — 15% off',
              details: null, sort_order: 0, budget: null, budget_period: null,
              start_date: '2026-06-05', end_date: '2026-06-05',
            },
          ],
        },
      ],
    },
    {
      phase_id: 'ph_convert_0003',
      phase_name: 'Convert',
      sort_order: 2,
      objective: 'Maximise launch-window sales',
      strategy: 'Retarget add-to-carts; dynamic product ads + abandoned cart email',
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      kpis: [
        { kpi_id: 5, kpi_name: 'Revenue', target_value: '$120K', target_numeric: 120000, unit: 'USD', sort_order: 0 },
        { kpi_id: 6, kpi_name: 'ROAS', target_value: '4.0x', target_numeric: 4.0, unit: 'ratio', sort_order: 1 },
      ],
      channel_actions: [
        {
          action_id: 'act_conv_meta',
          channel: 'meta_ads',
          objective: 'Convert warm audiences',
          strategy: 'DPA retargeting of viewers + ATC',
          action_notes: 'Catalogue sales objective.', budget: 14000, budget_period: 'total',
          start_date: '2026-07-01', end_date: '2026-07-31',
          linked_platform_campaigns: [
            { id: 'meta_cmp_9930', name: 'Northwind — Cold Brew — Convert (DPA)', status: 'ACTIVE' },
          ],
          assets: [
            {
              asset_id: 'ast_conv_dpa', asset_name: 'Dynamic Product Ads', asset_type: 'carousel',
              key_message: 'Your cold brew is waiting', cta: 'Complete your order',
              details: null, sort_order: 0, budget: 14000, budget_period: 'total',
              start_date: '2026-07-01', end_date: '2026-07-31',
            },
          ],
        },
      ],
    },
    {
      phase_id: 'ph_engage_0004',
      phase_name: 'Engage',
      sort_order: 3,
      objective: 'Retain new customers and lift repeat rate',
      strategy: 'Post-purchase email + loyalty offer; warm audience for autumn',
      start_date: '2026-07-15',
      end_date: '2026-07-31',
      kpis: [
        { kpi_id: 7, kpi_name: 'Repeat purchase rate', target_value: '22%', target_numeric: 22, unit: '%', sort_order: 0 },
      ],
      channel_actions: [
        {
          action_id: 'act_eng_email',
          channel: 'email',
          objective: 'Drive second purchase',
          strategy: 'Replenishment reminder + subscribe & save',
          action_notes: null, budget: null, budget_period: null,
          start_date: '2026-07-15', end_date: '2026-07-31',
          linked_platform_campaigns: [],
          assets: [
            {
              asset_id: 'ast_eng_email', asset_name: 'Replenishment reminder', asset_type: 'email',
              key_message: 'Running low? Lock in 10%', cta: 'Subscribe & save',
              details: null, sort_order: 0, budget: null, budget_period: null,
              start_date: '2026-07-20', end_date: '2026-07-20',
            },
          ],
        },
      ],
    },
  ],
}

export { TENANT }