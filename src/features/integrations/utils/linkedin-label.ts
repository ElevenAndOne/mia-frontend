/** What a LinkedIn connection actually covers.
 *
 * LinkedIn is two products behind one OAuth: ad accounts (Campaign Manager) and
 * company pages (organic). Labelling every connection "LinkedIn Ads" told a
 * workspace with only a company page that its advertising was connected and
 * being measured, when no ad data could flow at all.
 */
export interface LinkedinLabel {
  name: string
  description: string
}

export const linkedinLabelFor = (
  adAccountId?: string | null,
  organizationId?: string | null,
): LinkedinLabel => {
  if (adAccountId && organizationId)
    return {
      name: 'LinkedIn',
      description: 'Ad campaigns and company page',
    }
  if (adAccountId)
    return {
      name: 'LinkedIn Ads',
      description: 'B2B advertising and lead generation',
    }
  if (organizationId)
    return {
      name: 'LinkedIn Page',
      description: 'Organic posts and engagement — no ad account linked',
    }
  return {
    name: 'LinkedIn',
    description: 'Ad campaigns and company page',
  }
}
