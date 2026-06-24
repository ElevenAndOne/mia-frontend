/**
 * Mock fixtures for the design-preview build (MOCK_MODE only).
 *
 * Realistic-looking but entirely fake data — no real client/workspace info.
 * Keep this the single place to grow demo data as more pages are wired up.
 */
import type { AccountMapping } from '../features/accounts/types'
import type { Workspace } from '../features/workspace/types'
import type { UserProfile } from '../features/auth/types'

export const MOCK_SESSION_ID = 'mock_session_design_preview'

export const mockUser: UserProfile = {
  name: 'Demo Designer',
  email: 'designer@example.com',
  picture_url: '',
  google_user_id: 'mock_user_1',
  onboarding_completed: true,
}

export const mockAccounts: AccountMapping[] = [
  {
    id: 'mock_acct_default',
    name: 'Northwind Coffee Co.',
    display_name: 'Northwind Coffee Co.',
    google_ads_id: '123-456-7890',
    ga4_property_id: '987654321',
    meta_ads_id: 'act_1112223334',
    facebook_page_id: '555000111',
    facebook_page_name: 'Northwind Coffee',
    hubspot_portal_id: '44550011',
    business_type: 'Retail / eCommerce',
    color: '#007A9B',
    selected_mcc_id: '000-111-2222',
  },
]

export const mockWorkspaces: Workspace[] = [
  {
    tenant_id: 'mock_tenant_1',
    name: 'Northwind Coffee Co.',
    slug: 'northwind-coffee',
    role: 'owner',
    onboarding_completed: true,
    connected_platforms: ['google_ads', 'ga4', 'meta_ads', 'hubspot', 'brevo'],
    member_count: 4,
    is_active: true,
    logo_url: null,
  },
]
