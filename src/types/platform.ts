import { AccountMapping } from './account'

export type PlatformId =
  | 'google_ads'
  | 'ga4'
  | 'meta'
  | 'facebook_organic'
  | 'brevo'
  | 'mailchimp'
  | 'hubspot'

export interface PlatformConfig {
  id: PlatformId
  name: string
  icon: string
  accountKey: keyof AccountMapping
}

export interface PlatformStatus {
  connected: boolean
  accountId?: string
  accountName?: string
}

export interface Integration {
  platform: PlatformId
  status: PlatformStatus
}
