import { motion } from 'framer-motion'
import type { InsightData } from '../onboarding-chat-types'
import { BookmarkButton } from './bookmark-button'
import { PlatformIcon } from './platform-icon'

interface InsightCardProps {
  data: InsightData
}

const TYPE_STYLES = {
  grow: { badgeBg: 'bg-success-secondary', badgeText: 'text-success', metricColor: 'text-success' },
  optimize: { badgeBg: 'bg-warning-secondary', badgeText: 'text-warning', metricColor: 'text-warning' },
  protect: { badgeBg: 'bg-utility-info-200', badgeText: 'text-utility-info-700', metricColor: 'text-utility-info-600' }
}

const PLATFORM_LABELS: Record<string, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads'
}

export const InsightCard = ({ data }: InsightCardProps) => {
  const styles = TYPE_STYLES[data.type]
  const typeLabel = `${data.type.charAt(0).toUpperCase()}${data.type.slice(1)} Insights`
  const platformLabel = PLATFORM_LABELS[data.platform] || data.platform
  const showIcon = data.platform === 'google_ads'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-primary border border-secondary rounded-2xl p-4 shadow-sm max-w-[90%]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`${styles.badgeBg} ${styles.badgeText} subheading-sm px-2 py-1 rounded-full`}>
          {typeLabel}
        </span>
        <BookmarkButton />
      </div>

      <div className="flex items-center gap-2 mb-2">
        {showIcon && <PlatformIcon platform={data.platform} className="inline-flex items-center justify-center w-5 h-5" />}
        <span className="label-md text-primary">{platformLabel}</span>
      </div>

      <p className="paragraph-sm text-tertiary mb-3">{data.title}</p>

      <div className="space-y-3 mb-4">
        {data.metrics.map((metric, idx) => (
          <div key={idx} className="flex items-baseline gap-2 flex-wrap">
            <span className={`title-h3 ${styles.metricColor}`}>{metric.value}</span>
            <span className="paragraph-sm text-tertiary">{metric.label}</span>
            {metric.badge && (
              <span className="bg-success-secondary text-success subheading-sm px-2 py-0.5 rounded-full">
                {metric.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="paragraph-sm text-secondary">{data.description}</p>
    </motion.div>
  )
}
