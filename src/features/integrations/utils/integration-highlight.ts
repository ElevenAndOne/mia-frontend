const INTEGRATION_HIGHLIGHT_KEY = 'mia_integration_highlight'

type IntegrationHighlightId = 'google' | 'ga4' | 'meta' | 'facebook_organic'

const PLATFORM_TO_INTEGRATION: Record<string, IntegrationHighlightId> = {
  google_ads: 'google',
  ga4: 'ga4',
  meta_ads: 'meta',
  facebook_organic: 'facebook_organic',
}

export const mapPlatformsToIntegrationIds = (platformIds: string[]): IntegrationHighlightId[] => {
  const mapped = platformIds
    .map((id) => PLATFORM_TO_INTEGRATION[id])
    .filter(Boolean) as IntegrationHighlightId[]
  return Array.from(new Set(mapped))
}

export const setIntegrationHighlight = (platformIds: string[]): void => {
  if (typeof window === 'undefined') return
  const integrationIds = mapPlatformsToIntegrationIds(platformIds)
  window.sessionStorage.setItem(INTEGRATION_HIGHLIGHT_KEY, JSON.stringify(integrationIds))
}

export const getIntegrationHighlight = (): IntegrationHighlightId[] => {
  if (typeof window === 'undefined') return []
  const raw = window.sessionStorage.getItem(INTEGRATION_HIGHLIGHT_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean) as IntegrationHighlightId[]
    }
  } catch {
    // ignore parsing errors
  }
  return []
}

export const clearIntegrationHighlight = (): void => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(INTEGRATION_HIGHLIGHT_KEY)
}
