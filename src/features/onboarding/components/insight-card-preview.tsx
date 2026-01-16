/**
 * InsightCardPreview - Insight card component for onboarding
 *
 * Renders insight cards during the onboarding flow with platform-specific
 * styling and metrics. Shows Grow/Optimise/Protect insights with large
 * metric displays and descriptive text.
 */

import React from 'react'
import { motion } from 'framer-motion'

export interface InsightData {
  type: 'grow' | 'optimise' | 'protect'
  platform: string
  title: string
  metrics: { value: string; label: string; badge?: string }[]
  description: string
}

export interface InsightCardPreviewProps {
  data: InsightData
}

export const InsightCardPreview: React.FC<InsightCardPreviewProps> = ({ data }) => {
  const typeStyles = {
    grow: { badgeBg: 'bg-green-100', badgeText: 'text-green-700', metricColor: 'text-green-600' },
    optimise: { badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700', metricColor: 'text-yellow-600' },
    protect: { badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', metricColor: 'text-blue-600' }
  }

  const styles = typeStyles[data.type]
  const typeLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1) + ' Insights'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm max-w-[90%]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className={`${styles.badgeBg} ${styles.badgeText} text-xs font-medium px-2 py-1 rounded-full`}>
          {typeLabel}
        </span>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      {/* Platform */}
      <div className="flex items-center gap-2 mb-2">
        {data.platform === 'google_ads' && (
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#FBBC04" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
          </svg>
        )}
        <span className="font-semibold text-gray-900">
          {data.platform === 'google_ads' ? 'Google Ads' : data.platform === 'meta_ads' ? 'Meta Ads' : data.platform}
        </span>
      </div>

      {/* Title */}
      <p className="text-gray-600 text-sm mb-3">{data.title}</p>

      {/* Metrics */}
      <div className="space-y-3 mb-4">
        {data.metrics.map((metric, idx) => (
          <div key={idx} className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-4xl font-bold ${styles.metricColor}`}>{metric.value}</span>
            <span className="text-gray-600 text-sm">{metric.label}</span>
            {metric.badge && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                {metric.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Description */}
      <p className="text-gray-700 text-sm">{data.description}</p>
    </motion.div>
  )
}
