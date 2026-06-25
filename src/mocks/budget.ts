/**
 * Budget-tracker fixtures for MOCK_MODE. Shapes match
 * src/features/budget-tracker/types.ts (BudgetSnapshot / BudgetRecommendation).
 * A mid-month (June 2026) snapshot, pacing roughly on track.
 */
import { CAMPAIGN_ID } from './campaign'

export const budgetSnapshot = {
  campaign_id: CAMPAIGN_ID,
  campaign_name: 'Cold Brew Summer Launch',
  currency: 'USD',
  ended: false,
  spent_as_of: '2026-06-25',
  spend_pending: false,
  available_months: ['2026-05', '2026-06', '2026-07'],
  window: {
    start: '2026-06-01',
    end: '2026-06-30',
    mode: 'monthly',
    month: '2026-06',
    label: 'June 2026',
    complete: false,
    elapsed_days: 25,
    total_days: 30,
  },
  totals: {
    total_allocation: 16000,
    committed: 8000,
    flexible: 8000,
    over_allocated: false,
    spent: 12480,
    spent_pct: 0.78,
    expected_to_date: 13333,
    pacing_pct: 0.94,
    pacing_state: 'on',
    projected_close: 14976,
    projected_capped: false,
  },
  platforms: [
    {
      platform: 'meta_ads', label: 'Meta Ads', allocation: 6000, allocation_raw: 6000,
      budget_period: 'monthly', flights: 2, is_paid: true, budget_period_mixed: false,
      spend_available: true, linked: true, spent: 4920, remaining: 1080, spent_pct: 0.82,
      matched_campaigns: ['Northwind — Cold Brew — Reach'],
    },
    {
      platform: 'google_ads', label: 'Google Ads', allocation: 8000, allocation_raw: 8000,
      budget_period: 'monthly', flights: 1, is_paid: true, budget_period_mixed: false,
      spend_available: true, linked: true, spent: 7560, remaining: 440, spent_pct: 0.945,
      matched_campaigns: ['Northwind — Search — Cold Brew'],
    },
    {
      platform: 'email', label: 'Email', allocation: 1000, allocation_raw: 1000,
      budget_period: 'monthly', flights: 2, is_paid: false, budget_period_mixed: false,
      spend_available: false, linked: null, spent: null, remaining: null,
    },
    {
      platform: 'organic_social', label: 'Organic Social', allocation: 1000, allocation_raw: 1000,
      budget_period: 'monthly', flights: 1, is_paid: false, budget_period_mixed: false,
      spend_available: false, linked: null, spent: null, remaining: null,
    },
  ],
  fx: {
    display_currency: 'USD', rate: 1, source: 'demo',
    total_allocation_equiv: 16000, spent_equiv: 12480,
  },
}

export const budgetRecommendation = {
  available: true,
  kind: 'reallocation',
  reason: 'Google Ads is pacing ahead of target while Meta has headroom.',
  objective_type: 'maximize_conversions_with_stage_minimums',
  paid_channel_count: 2,
  total_budget: 14000,
  currency: 'USD',
  optimization_score: 0.86,
  platforms: [
    { platform: 'meta_ads', label: 'Meta Ads', current: 6000, recommended: 5200, delta: -800, direction: 'decrease', data_source: 'observed' },
    { platform: 'google_ads', label: 'Google Ads', current: 8000, recommended: 8800, delta: 800, direction: 'increase', data_source: 'observed' },
  ],
  data_quality: { observed: ['meta_ads', 'google_ads'], estimated: [] },
  narrative:
    'Search is converting efficiently at a 4.3x ROAS and is close to capped on budget, while Meta prospecting is past peak efficiency for the month. Shifting ~$800 from Meta to Google should lift projected revenue without hurting reach.',
  generated_at: '2026-06-25T09:00:00Z',
}
