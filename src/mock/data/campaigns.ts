/**
 * Mock Campaign Data
 * Generates fake campaign data for Google Ads and Meta Ads
 */

export interface MockCampaign {
  id: string
  name: string
  status: 'ENABLED' | 'PAUSED' | 'REMOVED'
  platform: 'GOOGLE_ADS' | 'META_ADS'
  account_id: string
  budget: number
  daily_budget: number
  impressions: number
  clicks: number
  conversions: number
  cost: number
  ctr: number
  cpc: number
  conv_rate: number
  created_date: string
  updated_date: string
}

export const mockCampaigns: MockCampaign[] = [
  {
    id: 'camp_google_001',
    name: 'Summer Fashion Collection',
    status: 'ENABLED',
    platform: 'GOOGLE_ADS',
    account_id: 'acc_001',
    budget: 50000,
    daily_budget: 1500,
    impressions: 125000,
    clicks: 3800,
    conversions: 156,
    cost: 18500,
    ctr: 3.04,
    cpc: 4.87,
    conv_rate: 4.11,
    created_date: '2024-06-01T00:00:00Z',
    updated_date: '2024-11-19T00:00:00Z'
  },
  {
    id: 'camp_meta_001',
    name: 'Brand Awareness Campaign',
    status: 'ENABLED',
    platform: 'META_ADS',
    account_id: 'acc_001',
    budget: 30000,
    daily_budget: 1000,
    impressions: 180000,
    clicks: 2900,
    conversions: 87,
    cost: 12300,
    ctr: 1.61,
    cpc: 4.24,
    conv_rate: 3.00,
    created_date: '2024-07-15T00:00:00Z',
    updated_date: '2024-11-19T00:00:00Z'
  },
  {
    id: 'camp_google_002',
    name: 'Local Restaurant Promotion',
    status: 'ENABLED',
    platform: 'GOOGLE_ADS',
    account_id: 'acc_002',
    budget: 25000,
    daily_budget: 800,
    impressions: 85000,
    clicks: 4200,
    conversions: 312,
    cost: 15600,
    ctr: 4.94,
    cpc: 3.71,
    conv_rate: 7.43,
    created_date: '2024-08-01T00:00:00Z',
    updated_date: '2024-11-18T00:00:00Z'
  },
  {
    id: 'camp_meta_002',
    name: 'SaaS Lead Generation',
    status: 'ENABLED',
    platform: 'META_ADS',
    account_id: 'acc_003',
    budget: 75000,
    daily_budget: 2500,
    impressions: 220000,
    clicks: 5100,
    conversions: 203,
    cost: 32500,
    ctr: 2.32,
    cpc: 6.37,
    conv_rate: 3.98,
    created_date: '2024-09-01T00:00:00Z',
    updated_date: '2024-11-19T00:00:00Z'
  }
]

export const generateRandomCampaign = (accountId: string, platform: 'GOOGLE_ADS' | 'META_ADS'): MockCampaign => {
  const campaignNames = [
    'Holiday Sale Campaign', 'Brand Awareness Drive', 'Product Launch', 'Retargeting Campaign',
    'Lead Generation', 'Website Traffic Boost', 'Conversion Optimizer', 'Mobile App Install',
    'Email Signup Campaign', 'Demo Request Campaign', 'Seasonal Promotion', 'Flash Sale Event'
  ]
  
  const name = campaignNames[Math.floor(Math.random() * campaignNames.length)]
  const dailyBudget = Math.floor(Math.random() * 2000) + 500
  const budget = dailyBudget * 30 // Monthly budget
  const impressions = Math.floor(Math.random() * 200000) + 50000
  const ctr = Math.random() * 5 + 1 // 1-6% CTR
  const clicks = Math.floor(impressions * (ctr / 100))
  const cpc = Math.random() * 8 + 2 // $2-10 CPC
  const cost = clicks * cpc
  const convRate = Math.random() * 8 + 2 // 2-10% conversion rate
  const conversions = Math.floor(clicks * (convRate / 100))
  
  const createdDate = new Date()
  createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 90))
  
  return {
    id: `camp_${platform.toLowerCase()}_${Math.random().toString(36).substr(2, 6)}`,
    name,
    status: Math.random() > 0.1 ? 'ENABLED' : 'PAUSED',
    platform,
    account_id: accountId,
    budget: Math.floor(budget),
    daily_budget: dailyBudget,
    impressions,
    clicks,
    conversions,
    cost: Math.floor(cost),
    ctr: Math.round(ctr * 100) / 100,
    cpc: Math.round(cpc * 100) / 100,
    conv_rate: Math.round(convRate * 100) / 100,
    created_date: createdDate.toISOString(),
    updated_date: new Date().toISOString()
  }
}

export const getMockCampaignsForAccount = (accountId: string): MockCampaign[] => {
  const accountCampaigns = mockCampaigns.filter(campaign => campaign.account_id === accountId)
  
  // Add some random campaigns if none exist
  if (accountCampaigns.length === 0) {
    const campaignCount = Math.floor(Math.random() * 4) + 2
    const campaigns: MockCampaign[] = []
    
    for (let i = 0; i < campaignCount; i++) {
      const platform = Math.random() > 0.5 ? 'GOOGLE_ADS' : 'META_ADS'
      campaigns.push(generateRandomCampaign(accountId, platform))
    }
    
    return campaigns
  }
  
  return accountCampaigns
}
