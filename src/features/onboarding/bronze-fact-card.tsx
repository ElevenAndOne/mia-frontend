/**
 * Bronze Fact Card - Displays instant marketing facts during onboarding
 *
 * Features:
 * - Platform icon
 * - Headline with key metric
 * - Optional detail text
 * - Subtle gradient background
 */

import React from 'react'
import { motion } from 'framer-motion'

interface BronzeFactCardProps {
  platform: string
  headline: string
  detail?: string
  metricValue?: number
  metricName?: string
}

// Platform icons (using simple text for now, can be replaced with actual icons)
const PLATFORM_ICONS: Record<string, { icon: string; color: string; bgColor: string }> = {
  google_ads: {
    icon: 'G',
    color: '#4285F4',
    bgColor: 'from-blue-50 to-blue-100',
  },
  meta_ads: {
    icon: 'M',
    color: '#0668E1',
    bgColor: 'from-blue-50 to-indigo-100',
  },
  ga4: {
    icon: 'GA',
    color: '#E37400',
    bgColor: 'from-orange-50 to-yellow-100',
  },
  brevo: {
    icon: 'B',
    color: '#0B996E',
    bgColor: 'from-green-50 to-emerald-100',
  },
  hubspot: {
    icon: 'HS',
    color: '#FF7A59',
    bgColor: 'from-orange-50 to-red-100',
  },
  mailchimp: {
    icon: 'MC',
    color: '#FFE01B',
    bgColor: 'from-yellow-50 to-amber-100',
  },
  facebook_organic: {
    icon: 'FB',
    color: '#1877F2',
    bgColor: 'from-blue-50 to-blue-100',
  },
  unknown: {
    icon: '?',
    color: '#6B7280',
    bgColor: 'from-gray-50 to-gray-100',
  },
}

const BronzeFactCard: React.FC<BronzeFactCardProps> = ({
  platform,
  headline,
  detail,
  metricValue,
  metricName,
}) => {
  const platformConfig = PLATFORM_ICONS[platform] || PLATFORM_ICONS.unknown

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`bg-gradient-to-br ${platformConfig.bgColor} rounded-xl p-4 border border-gray-100 shadow-sm`}
    >
      <div className="flex items-start gap-3">
        {/* Platform icon */}
        <div
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0"
          style={{ color: platformConfig.color }}
        >
          <span className="text-sm font-bold">{platformConfig.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-gray-900 leading-snug">
            {headline}
          </p>

          {detail && (
            <p className="text-sm text-gray-600 mt-1">
              {detail}
            </p>
          )}

          {/* Metric badge (optional) */}
          {metricValue !== undefined && metricName && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-white/60 rounded-md">
              <span className="text-xs font-semibold text-gray-700">
                {typeof metricValue === 'number'
                  ? metricValue.toLocaleString()
                  : metricValue}
              </span>
              <span className="text-xs text-gray-500">{metricName}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default BronzeFactCard
