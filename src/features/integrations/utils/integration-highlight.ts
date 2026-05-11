import { StorageKey } from '../../../constants/storage-keys'

type IntegrationHighlightId = 'google' | 'ga4' | 'meta' | 'facebook_organic'

const PLATFORM_TO_INTEGRATION: Record<string, IntegrationHighlightId> = {
  google_ads: 'google',
  ga4: 'ga4',
  meta_ads: 'meta',
  facebook_organic: 'facebook_organic',
}

// Key scoped to the active workspace so highlights from workspace A don't bleed
// into workspace B after a switch (sessionStorage survives same-tab page reloads).
const highlightKey = (tenantId?: string | null) =>
  `${StorageKey.INTEGRATION_HIGHLIGHT}:${tenantId ?? 'user'}`

export const mapPlatformsToIntegrationIds = (platformIds: string[]): IntegrationHighlightId[] => {
  const mapped = platformIds
    .map((id) => PLATFORM_TO_INTEGRATION[id])
    .filter(Boolean) as IntegrationHighlightId[]
  return Array.from(new Set(mapped))
}

export const setIntegrationHighlight = (platformIds: string[], tenantId?: string | null): void => {
  if (typeof window === 'undefined') return
  const integrationIds = mapPlatformsToIntegrationIds(platformIds)
  window.sessionStorage.setItem(highlightKey(tenantId), JSON.stringify(integrationIds))
}

export const getIntegrationHighlight = (tenantId?: string | null): IntegrationHighlightId[] => {
  if (typeof window === 'undefined') return []
  const raw = window.sessionStorage.getItem(highlightKey(tenantId))
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

export const clearIntegrationHighlight = (tenantId?: string | null): void => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(highlightKey(tenantId))
}