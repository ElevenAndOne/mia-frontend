import { motion } from 'framer-motion'
import type { BronzeCardData } from '../onboarding-chat-types'
import { BookmarkButton } from './bookmark-button'
import { PlatformIcon } from './platform-icon'

type BronzeCardProps = BronzeCardData

const PLATFORM_STYLES: Record<string, { iconBg: string }> = {
  google_ads: { iconBg: 'bg-primary' },
  meta_ads: { iconBg: 'bg-primary' },
  ga4: { iconBg: 'bg-primary' }
}

const VARIANT_STYLES = {
  primary: {
    bg: 'bg-linear-to-br from-utility-teal-100 to-utility-success-200',
    border: 'border-utility-teal-200',
    badgeBg: 'bg-utility-teal-100',
    badgeText: 'text-utility-teal-700'
  },
  secondary: {
    bg: 'bg-linear-to-br from-utility-info-100 to-utility-info-200',
    border: 'border-utility-info-300',
    badgeBg: 'bg-utility-info-200',
    badgeText: 'text-utility-info-700'
  }
}

export const BronzeCard = ({ platform, headline, metricValue, metricLabel, secondaryMetric, variant = 'primary' }: BronzeCardProps) => {
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
          <p className="paragraph-sm text-tertiary">{headline}</p>
          <p className="title-h4 text-primary mt-1">{formattedValue}</p>
          <p className="paragraph-sm text-tertiary">{metricLabel}</p>

          {secondaryMetric && (
            <div
              className={`${styles.badgeBg} ${styles.badgeText} inline-flex items-center gap-1 px-2 py-1 rounded-full subheading-sm mt-2`}
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
