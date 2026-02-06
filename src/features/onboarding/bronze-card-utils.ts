import type { BronzeFact } from './onboarding-context'
import type { BronzeCardData, BronzeCardVariant } from './onboarding-chat-types'

const isClicksMetric = (fact: BronzeFact): boolean => {
  const metricName = fact.metric_name?.toLowerCase() ?? ''
  const headline = fact.headline.toLowerCase()
  return metricName.includes('click') || headline.includes('click')
}

const parseHeadline = (fact: BronzeFact): { headlineText: string; metricLabelText: string } => {
  let headlineText = ''
  let metricLabelText = fact.detail || ''

  if (typeof fact.metric_value === 'number') {
    // Use indexOf to split on the metric value, preserving "30 days" etc.
    const formattedValue = fact.metric_value.toLocaleString()
    const valueIndex = fact.headline.indexOf(formattedValue)

    if (valueIndex !== -1) {
      headlineText = fact.headline.substring(0, valueIndex).trim()
      metricLabelText = fact.headline.substring(valueIndex + formattedValue.length).trim() || fact.detail || ''
    } else {
      headlineText = fact.headline
    }
  } else {
    headlineText = fact.headline
  }

  return { headlineText, metricLabelText }
}

const parseSecondaryMetric = (detail?: string): { value: string; label: string } | undefined => {
  if (!detail) return undefined

  const detailMatch = detail.match(/(?:With\s+)?([\d,.%]+)\s+(.+)/i)
  if (!detailMatch) return undefined

  return { value: detailMatch[1], label: detailMatch[2] }
}

export const buildBronzeCardData = (fact: BronzeFact): BronzeCardData => {
  const { headlineText, metricLabelText } = parseHeadline(fact)
  const secondaryMetric = parseSecondaryMetric(fact.detail)
  const variant: BronzeCardVariant = isClicksMetric(fact) ? 'secondary' : 'primary'

  return {
    platform: fact.platform,
    headline: headlineText,
    metricValue: fact.metric_value ?? 0,
    metricLabel: metricLabelText,
    secondaryMetric,
    variant
  }
}
