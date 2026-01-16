/**
 * BronzeCardV2 - Bronze card component with large metrics
 *
 * Displays key metrics in an eye-catching card format with:
 * - Platform icon and colors
 * - Large metric display
 * - Secondary metrics as badges
 * - Variant styling (primary for reach, secondary for clicks)
 */

import React from 'react'
import { motion } from 'framer-motion'

export interface BronzeCardV2Props {
  platform: string
  headline: string
  metricValue: number | string
  metricLabel: string
  secondaryMetric?: { value: string; label: string }
  variant?: 'primary' | 'secondary' // primary = reach (teal), secondary = clicks (blue)
}

export const BronzeCardV2: React.FC<BronzeCardV2Props> = ({
  platform,
  headline,
  metricValue,
  metricLabel,
  secondaryMetric,
  variant = 'primary'
}) => {
  // Platform-specific styling
  const platformStyles: Record<string, { icon: string; iconBg: string }> = {
    google_ads: { icon: '/icons/google-ads.svg', iconBg: 'bg-white' },
    meta_ads: { icon: '/icons/meta.svg', iconBg: 'bg-white' },
    ga4: { icon: '/icons/ga4.svg', iconBg: 'bg-white' },
  }

  const config = platformStyles[platform] || platformStyles.google_ads

  // Variant colors - primary (teal/green for reach), secondary (blue for clicks)
  const variantStyles = {
    primary: {
      bg: 'bg-linear-to-br from-teal-50 to-green-100',
      border: 'border-teal-200',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-700'
    },
    secondary: {
      bg: 'bg-linear-to-br from-blue-50 to-blue-100',
      border: 'border-blue-200',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700'
    }
  }

  const styles = variantStyles[variant]

  // Format the metric value
  const formattedValue = typeof metricValue === 'number'
    ? metricValue.toLocaleString()
    : metricValue

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`${styles.bg} ${styles.border} border rounded-2xl p-4 max-w-[90%]`}
    >
      <div className="flex items-start gap-3">
        {/* Platform Icon */}
        <div className={`${config.iconBg} w-10 h-10 rounded-lg flex items-center justify-center shadow-xs shrink-0`}>
          {platform === 'google_ads' ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#FBBC04" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
          ) : platform === 'meta_ads' ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#0866FF" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          ) : (
            <span className="text-sm font-bold text-gray-600">G</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-gray-600 text-sm">{headline}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formattedValue}
          </p>
          <p className="text-gray-600 text-sm">{metricLabel}</p>

          {/* Secondary metric badge */}
          {secondaryMetric && (
            <div className={`${styles.badgeBg} ${styles.badgeText} inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs mt-2`}>
              <span className="font-semibold">With {secondaryMetric.value}</span>
              <span>{secondaryMetric.label}</span>
            </div>
          )}
        </div>

        {/* Bookmark icon */}
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}
