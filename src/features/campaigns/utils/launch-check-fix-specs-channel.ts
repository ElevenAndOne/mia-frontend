// Fixes that write to the channel action or its push profile, rather than to
// the ads. Split from launch-check-fix-specs.ts for the file-size limit.

import type { FixSpec } from './launch-check-fixes'

export const CHANNEL_FIX_SPECS: Record<string, FixSpec> = {
  // ── The channel's own settings ───────────────────────────────────────────
  no_budget: {
    target: 'channel',
    field: 'budget',
    kind: 'budget',
    cta: 'Set budget',
    placeholder: '5000',
    hint: 'The channel total — Mia converts it to what each platform needs.',
  },
  budget_needs_end: {
    target: 'channel',
    field: 'end_date',
    kind: 'date',
    cta: 'Set end date',
    hint: 'A flight total needs an end date to become a daily budget.',
  },
  no_flight_end: {
    target: 'channel',
    field: 'end_date',
    kind: 'date',
    cta: 'Set end date',
    hint: "Meta's lifetime budgets need one.",
  },
  flight_ended: {
    target: 'channel',
    field: 'end_date',
    kind: 'date',
    cta: 'Move end date',
    hint: 'Must be in the future — the platforms reject a past end date.',
  },

  // ── Ready-to-push state ─────────────────────────────────────────────────
  no_ready_assets: {
    target: 'asset',
    field: 'status',
    kind: 'ready',
    cta: 'Mark ads ready',
    hint: 'Only ads marked Ready are pushed. Tick the ones that are approved.',
  },
  lead_form_unsupported: {
    target: 'asset',
    field: 'destination_type',
    kind: 'select',
    cta: 'Change destination',
    options: [{ value: 'website', label: 'Website (send traffic to the landing page)' }],
    hint: "Lead-form ads can't be pushed yet — send these to the website instead.",
  },

  // ── Copy that fails the platform's limits ────────────────────────────────
  invalid_rsa_copy: {
    target: 'asset',
    field: 'rsa',
    kind: 'rsa',
    cta: 'Fix copy',
    hint: 'One per line. Google needs 3-15 headlines (≤30 chars) and 2-4 descriptions (≤90).',
  },

  // ── Budgets that are technically set but too small to serve ──────────────
  budget_below_daily_minimum: {
    target: 'channel',
    field: 'budget',
    kind: 'budget',
    cta: 'Raise budget',
    placeholder: '5000',
    hint: "Meta rejects lifetime budgets under about R15/day — raise the channel's total.",
  },
  budget_below_serving_threshold: {
    target: 'channel',
    field: 'budget',
    kind: 'budget',
    cta: 'Raise budget',
    placeholder: '5000',
    hint: 'Under about R10/day a Search campaign barely enters an auction.',
  },
  no_end_date_always_on: {
    target: 'channel',
    field: 'end_date',
    kind: 'date',
    cta: 'Set end date',
    hint: 'Leave it unset for a deliberately always-on campaign, or give it a stop date.',
  },
  duplicate_campaign_name: {
    target: 'push_config',
    field: 'name_template',
    kind: 'text',
    cta: 'Rename push',
    placeholder: 'Y{yy}_{client}_{campaign}_{phase}_{channel}_{date}',
    hint: 'Tokens: {yy} {date} {client} {campaign} {phase} {channel}. Must produce a new name.',
  },

  // ── The declaration itself, rather than accepting the warning ────────────
  special_ad_category: {
    target: 'push_config',
    field: 'special_ad_categories',
    kind: 'select',
    cta: 'Declare',
    options: [
      { value: 'none', label: 'None of these apply' },
      { value: 'HOUSING', label: 'Housing' },
      { value: 'EMPLOYMENT', label: 'Employment' },
      { value: 'CREDIT', label: 'Credit' },
      { value: 'FINANCIAL_PRODUCTS_SERVICES', label: 'Financial products & services' },
      { value: 'ISSUES_ELECTIONS_POLITICS', label: 'Social issues, elections or politics' },
      { value: 'ONLINE_GAMBLING_AND_GAMING', label: 'Online gambling & gaming' },
    ],
    hint: 'Meta requires this for regulated verticals, and it restricts targeting.',
  },
}
