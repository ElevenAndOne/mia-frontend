export type InsightType = 'grow' | 'optimize' | 'protect'

export interface InsightConfig {
  title: string
  sectionTitle: string
  loadingMessage: string
  colors: {
    badge: string
    actionBg: string
    actionBorder: string
    actionLabel: string
  }
}

export const INSIGHT_CONFIGS: Record<InsightType, InsightConfig> = {
  grow: {
    title: 'Grow',
    sectionTitle: 'Key Growth Opportunities',
    loadingMessage: 'Analyzing your growth opportunities...',
    colors: {
      badge: 'bg-utility-brand-500',
      actionBg: 'bg-brand-primary',
      actionBorder: 'border-brand',
      actionLabel: 'text-brand-primary',
    },
  },
  optimize: {
    title: 'Optimise',
    sectionTitle: 'Key Optimization Opportunities',
    loadingMessage: 'Analyzing optimization opportunities...',
    colors: {
      badge: 'bg-utility-info-500',
      actionBg: 'bg-utility-info-100',
      actionBorder: 'border-utility-info-500',
      actionLabel: 'text-utility-info-700',
    },
  },
  protect: {
    title: 'Protect',
    sectionTitle: 'Key Risk Areas',
    loadingMessage: 'Analyzing potential risks...',
    colors: {
      badge: 'bg-utility-success-500',
      actionBg: 'bg-success-primary',
      actionBorder: 'border-utility-success-500',
      actionLabel: 'text-success',
    },
  },
}

export const INSIGHT_TITLES: Record<InsightType, string> = {
  grow: 'Grow Insights',
  optimize: 'Optimize Insights',
  protect: 'Protect Insights',
}

export const INSIGHT_DESCRIPTIONS: Record<InsightType, string> = {
  grow: 'Discover opportunities to scale your best-performing campaigns and creatives',
  optimize: 'Identify inefficiencies and improve ROI across your marketing channels',
  protect: 'Safeguard your high-performing campaigns from potential risks',
}
