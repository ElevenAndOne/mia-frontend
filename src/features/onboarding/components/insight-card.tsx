import { motion } from 'framer-motion'
import type { InsightData } from '../onboarding-chat-types'
import { BookmarkButton } from './bookmark-button'
import { PlatformIcon } from './platform-icon'

interface InsightCardProps {
  data: InsightData
}

const TYPE_STYLES = {
  grow: { badgeBg: 'bg-green-100', badgeText: 'text-green-700', metricColor: 'text-green-600' },
  optimise: { badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700', metricColor: 'text-yellow-600' },
  protect: { badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', metricColor: 'text-blue-600' }
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
      className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm max-w-[90%]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`${styles.badgeBg} ${styles.badgeText} text-xs font-medium px-2 py-1 rounded-full`}>
          {typeLabel}
        </span>
        <BookmarkButton />
      </div>

      <div className="flex items-center gap-2 mb-2">
        {showIcon && <PlatformIcon platform={data.platform} className="inline-flex items-center justify-center w-5 h-5" />}
        <span className="font-semibold text-gray-900">{platformLabel}</span>
      </div>

      <p className="text-gray-600 text-sm mb-3">{data.title}</p>

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

      <p className="text-gray-700 text-sm">{data.description}</p>
    </motion.div>
  )
}
