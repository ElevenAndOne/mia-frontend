import type { Crumb } from '../../../components/breadcrumbs'

const VIEW_LABELS: Record<string, string> = {
  overview: 'Overview',
  calendar: 'Calendar',
  builder: 'Builder',
  setup: 'Setup',
  new: 'New campaign',
}

const SECTION_LABELS: Record<string, string> = {
  measurement: 'Measurement',
  sources: 'Sources',
  linked: 'Linked content',
  readiness: 'Readiness',
  rules: 'Rules',
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, ' ')

/**
 * Breadcrumbs for the old campaign pages (/campaigns/...). Agency reaches them from Workspace
 * Settings → Old campaigns since 19 Nov 2026, so the trail says so; Basic keeps Home › Campaigns.
 * Every crumb but the last is a working link.
 */
export const oldCampaignCrumbs = (
  isBasic: boolean,
  name: string | undefined,
  campaignId: string | undefined,
  view: string | undefined,
  section?: string
): Crumb[] => {
  const head: Crumb[] = isBasic
    ? [{ label: 'Home', to: '/home' }, { label: 'Campaigns', to: '/campaigns' }]
    : [
        { label: 'Home', to: '/home' },
        { label: 'Settings', to: '/settings/workspace' },
        { label: 'Old campaigns', to: '/settings/workspace?tab=oldcampaigns' },
      ]
  if (view === 'new' || !campaignId) return [...head, { label: 'New campaign' }]
  const crumbs: Crumb[] = [...head, { label: name ?? 'Campaign', to: `/campaigns/${campaignId}/overview` }]
  if (view) crumbs.push({ label: VIEW_LABELS[view] ?? titleCase(view), to: `/campaigns/${campaignId}/${view}` })
  if (section) crumbs.push({ label: SECTION_LABELS[section] ?? titleCase(section) })
  return crumbs
}
