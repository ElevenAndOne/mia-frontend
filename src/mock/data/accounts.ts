/**
 * Mock Account Data  
 * Generates fake account mappings for development
 */

import { AccountMapping } from '../../contexts/SessionContext'

export const mockAccounts: AccountMapping[] = [
  {
    id: 'acc_001',
    name: 'E-commerce Fashion Store',
    google_ads_id: 'gads_123456789',
    ga4_property_id: 'ga4_987654321', 
    meta_ads_id: 'meta_ads_456789',
    business_type: 'E-commerce',
    color: '#4F46E5',
    display_name: 'Fashion Store Pro'
  },
  {
    id: 'acc_002', 
    name: 'Local Restaurant Chain',
    google_ads_id: 'gads_111222333',
    ga4_property_id: 'ga4_333222111',
    meta_ads_id: 'meta_ads_789012',
    business_type: 'Restaurant',
    color: '#059669',
    display_name: 'Tasty Bites'
  },
  {
    id: 'acc_003',
    name: 'SaaS Tech Startup', 
    google_ads_id: 'gads_444555666',
    ga4_property_id: 'ga4_666555444',
    meta_ads_id: 'meta_ads_345678',
    business_type: 'Technology',
    color: '#DC2626',
    display_name: 'TechFlow'
  },
  {
    id: 'acc_004',
    name: 'Fitness & Wellness',
    google_ads_id: 'gads_777888999',
    ga4_property_id: 'ga4_999888777',
    business_type: 'Health & Fitness',
    color: '#7C3AED',
    display_name: 'FitLife Studio'
  },
  {
    id: 'acc_005',
    name: 'Real Estate Agency',
    google_ads_id: 'gads_101112131',
    ga4_property_id: 'ga4_131211101',
    meta_ads_id: 'meta_ads_192837',
    business_type: 'Real Estate', 
    color: '#EA580C',
    display_name: 'Prime Properties'
  }
]

export const generateRandomAccount = (): AccountMapping => {
  const businessNames = [
    'Digital Solutions', 'Market Leaders', 'Growth Partners', 'Success Corp',
    'Innovation Hub', 'Smart Business', 'Elite Services', 'Premium Brands'
  ]
  const businessTypes = [
    'E-commerce', 'Technology', 'Marketing', 'Consulting', 'Healthcare',
    'Education', 'Finance', 'Retail', 'Manufacturing', 'Media'
  ]
  const colors = [
    '#4F46E5', '#059669', '#DC2626', '#7C3AED', '#EA580C',
    '#0891B2', '#BE185D', '#9333EA', '#C2410C', '#0D9488'
  ]
  
  const name = businessNames[Math.floor(Math.random() * businessNames.length)]
  const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)]
  const color = colors[Math.floor(Math.random() * colors.length)]
  const id = `acc_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id,
    name: `${name} ${businessType}`,
    google_ads_id: `gads_${Math.floor(Math.random() * 1000000000)}`,
    ga4_property_id: `ga4_${Math.floor(Math.random() * 1000000000)}`,
    meta_ads_id: Math.random() > 0.3 ? `meta_ads_${Math.floor(Math.random() * 1000000)}` : undefined,
    business_type: businessType,
    color,
    display_name: name
  }
}

export const getMockAccount = (id?: string): AccountMapping => {
  if (id) {
    const existingAccount = mockAccounts.find(account => account.id === id)
    if (existingAccount) return existingAccount
  }
  
  return mockAccounts[0] || generateRandomAccount()
}

export const getMockAccountsForUser = (userId: string): AccountMapping[] => {
  // Simulate user having access to 2-4 accounts
  const accountCount = Math.floor(Math.random() * 3) + 2
  const shuffled = [...mockAccounts].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, accountCount)
}
