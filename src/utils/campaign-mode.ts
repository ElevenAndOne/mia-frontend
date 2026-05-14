import { StorageKey } from '../constants/storage-keys'

export function getCampaignMode(tenantId: string): string | null {
  try {
    return localStorage.getItem(StorageKey.CAMPAIGN_MODE_PREFIX + tenantId)
  } catch {
    return null
  }
}

export function setCampaignMode(tenantId: string, value: string): void {
  try {
    localStorage.setItem(StorageKey.CAMPAIGN_MODE_PREFIX + tenantId, value)
  } catch {
    // ignore storage errors
  }
}
