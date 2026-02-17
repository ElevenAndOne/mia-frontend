import { useMemo } from 'react'

interface IntegrationPromptState {
  title: string
  message: string
  missing: string[]
  missingPlatformIds: string[]
  primaryActionLabel: string
}

interface IntegrationPromptOptions {
  connectedPlatforms: string[]
  isLoading?: boolean
  workspaceRole?: string  // Only show for owner/admin (viewers can't manage integrations)
}

const formatList = (items: string[]): string => {
  if (items.length <= 1) return items[0] || ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

export const useIntegrationPrompt = ({
  connectedPlatforms,
  isLoading = false,
  workspaceRole,
}: IntegrationPromptOptions): IntegrationPromptState | null => {
  return useMemo(() => {
    if (isLoading) return null

    // Don't prompt viewers/analysts — they can't manage integrations
    if (workspaceRole && !['owner', 'admin'].includes(workspaceRole)) return null

    const missingPlatformIds: string[] = []
    const missingLabels: string[] = []

    const addMissing = (id: string, label: string) => {
      missingPlatformIds.push(id)
      missingLabels.push(label)
    }

    if (!connectedPlatforms.includes('google_ads')) addMissing('google_ads', 'Google Ads')
    if (!connectedPlatforms.includes('ga4')) addMissing('ga4', 'GA4')
    // Meta Ads and Facebook Organic hidden while awaiting Meta platform review
    // if (!connectedPlatforms.includes('meta_ads')) addMissing('meta_ads', 'Meta Ads')
    // if (!connectedPlatforms.includes('facebook_organic')) addMissing('facebook_organic', 'Facebook Organic')

    if (missingLabels.length === 0) return null

    const missingLabel = formatList(missingLabels)
    const title = missingLabels.length > 1 ? 'Finish connecting your data' : `Connect ${missingLabels[0]}`
    const message = `Connect ${missingLabel} to unlock the most accurate insights and recommendations.`

    return {
      title,
      message,
      missing: missingLabels,
      missingPlatformIds,
      primaryActionLabel: 'Go to Integrations',
    }
  }, [connectedPlatforms, isLoading, workspaceRole])
}
