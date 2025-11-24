/**
 * Mock Insights Data
 * Generates fake analytics and performance insights
 */

export interface MockInsight {
  id: string
  account_id: string
  campaign_id?: string
  metric_type: 'impressions' | 'clicks' | 'conversions' | 'cost' | 'revenue'
  value: number
  date: string
  platform: 'GOOGLE_ADS' | 'META_ADS' | 'GA4'
  dimension?: string
}

export interface MockPerformanceData {
  date: string
  impressions: number
  clicks: number
  conversions: number
  cost: number
  revenue: number
  ctr: number
  cpc: number
  roas: number
}

export const generateMockPerformanceData = (days: number = 30): MockPerformanceData[] => {
  const data: MockPerformanceData[] = []
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - days)
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + i)
    
    // Add some weekly patterns and trends
    const dayOfWeek = date.getDay()
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0
    const trendMultiplier = 1 + (i / days) * 0.2 // Growing trend
    
    const impressions = Math.floor((Math.random() * 50000 + 30000) * weekendMultiplier * trendMultiplier)
    const ctr = Math.random() * 3 + 2 // 2-5% CTR
    const clicks = Math.floor(impressions * (ctr / 100))
    const cpc = Math.random() * 4 + 3 // $3-7 CPC
    const cost = clicks * cpc
    const convRate = Math.random() * 5 + 3 // 3-8% conversion rate
    const conversions = Math.floor(clicks * (convRate / 100))
    const avgOrderValue = Math.random() * 100 + 50 // $50-150 AOV
    const revenue = conversions * avgOrderValue
    const roas = revenue / cost
    
    data.push({
      date: date.toISOString().split('T')[0],
      impressions,
      clicks,
      conversions,
      cost: Math.floor(cost),
      revenue: Math.floor(revenue),
      ctr: Math.round(ctr * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      roas: Math.round(roas * 100) / 100
    })
  }
  
  return data
}

export const mockInsightsSummary = {
  totalImpressions: 1250000,
  totalClicks: 38500,
  totalConversions: 1840,
  totalCost: 156300,
  totalRevenue: 284500,
  averageCtr: 3.08,
  averageCpc: 4.06,
  averageRoas: 1.82,
  growth: {
    impressions: 12.5,
    clicks: 8.3,
    conversions: 15.7,
    cost: 6.2,
    revenue: 18.9
  }
}

export const generateInsightsByDimension = (dimension: 'device' | 'age_group' | 'gender' | 'location') => {
  switch (dimension) {
    case 'device':
      return [
        { name: 'Mobile', impressions: 750000, clicks: 22500, conversions: 1104, cost: 91800 },
        { name: 'Desktop', impressions: 400000, clicks: 12800, conversions: 614, cost: 52000 },
        { name: 'Tablet', impressions: 100000, clicks: 3200, conversions: 122, cost: 12500 }
      ]
    
    case 'age_group':
      return [
        { name: '18-24', impressions: 300000, clicks: 10500, conversions: 420, cost: 42700 },
        { name: '25-34', impressions: 450000, clicks: 15750, conversions: 788, cost: 64100 },
        { name: '35-44', impressions: 350000, clicks: 9450, conversions: 473, cost: 38500 },
        { name: '45-54', impressions: 150000, clicks: 2800, conversions: 159, cost: 11000 }
      ]
    
    case 'gender':
      return [
        { name: 'Female', impressions: 700000, clicks: 22400, conversions: 1078, cost: 91200 },
        { name: 'Male', impressions: 550000, clicks: 16100, conversions: 762, cost: 65100 }
      ]
    
    case 'location':
      return [
        { name: 'California', impressions: 200000, clicks: 6800, conversions: 340, cost: 27600 },
        { name: 'New York', impressions: 180000, clicks: 6120, conversions: 294, cost: 24900 },
        { name: 'Texas', impressions: 160000, clicks: 5280, conversions: 264, cost: 21500 },
        { name: 'Florida', impressions: 140000, clicks: 4620, conversions: 231, cost: 18800 },
        { name: 'Other States', impressions: 570000, clicks: 15680, conversions: 711, cost: 63500 }
      ]
  }
}
