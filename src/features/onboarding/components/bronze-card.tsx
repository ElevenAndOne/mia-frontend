import { motion } from 'framer-motion'
import type { BronzeCardData } from '../onboarding-chat-types'
import { BookmarkButton } from './bookmark-button'
import { PlatformIcon } from './platform-icon'

type BronzeCardProps = BronzeCardData

const PLATFORM_STYLES: Record<string, { iconBg: string }> = {
  google_ads: { iconBg: 'bg-white' },
  meta_ads: { iconBg: 'bg-white' },
  ga4: { iconBg: 'bg-white' }
}

const VARIANT_STYLES = {
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

export const BronzeCard = ({
  platform,
  headline,
  metricValue,
  metricLabel,
  secondaryMetric,
  variant = 'primary'
}: BronzeCardProps) => {
  const styles = VARIANT_STYLES[variant]
  const platformConfig = PLATFORM_STYLES[platform] || PLATFORM_STYLES.google_ads
  const formattedValue = typeof metricValue === 'number' ? metricValue.toLocaleString() : metricValue

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`${styles.bg} ${styles.border} border rounded-2xl p-4 max-w-[90%]`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`${platformConfig.iconBg} w-10 h-10 rounded-lg flex items-center justify-center shadow-sm shrink-0`}
        >
          <PlatformIcon platform={platform} />
        </div>

        <div className="flex-1">
          <p className="text-gray-600 text-sm">{headline}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formattedValue}</p>
          <p className="text-gray-600 text-sm">{metricLabel}</p>

          {secondaryMetric && (
            <div
              className={`${styles.badgeBg} ${styles.badgeText} inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs mt-2`}
            >
              <span className="font-semibold">With {secondaryMetric.value}</span>
              <span>{secondaryMetric.label}</span>
            </div>
          )}
        </div>

        <BookmarkButton />
      </div>
    </motion.div>
  )
}
