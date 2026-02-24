import type { BronzeFact } from './onboarding-context'
import type { BronzeCardData, BronzeCardVariant } from './onboarding-chat-types'

const isClicksMetric = (fact: BronzeFact): boolean => {
  const metricName = fact.metric_name?.toLowerCase() ?? ''
  const headline = fact.headline.toLowerCase()
  return metricName.includes('click') || headline.includes('click')
}

const parseHeadline = (fact: BronzeFact): { headlineText: string; metricLabelText: string; metricSuffix: string } => {
  let headlineText = ''
  let metricLabelText = fact.detail || ''
  let metricSuffix = ''

  if (typeof fact.metric_value === 'number') {
    // Try multiple formats to match the value in the headline
    // Backend may round differently (e.g. headline "2.87%" but metric_value 2.873)
    const candidates = [
      fact.metric_value.toLocaleString(),
      fact.metric_value.toFixed(2),
      fact.metric_value.toFixed(1),
      Math.round(fact.metric_value).toLocaleString()
    ]

    let valueIndex = -1
    let matchLength = 0
    for (const fmt of candidates) {
      valueIndex = fact.headline.indexOf(fmt)
      if (valueIndex !== -1) {
        matchLength = fmt.length
        break
      }
    }

    if (valueIndex !== -1) {
      headlineText = fact.headline.substring(0, valueIndex).trim()
      let remainder = fact.headline.substring(valueIndex + matchLength)
      // Capture % suffix so it can be displayed with the large number
      if (remainder.startsWith('%')) {
        metricSuffix = '%'
        remainder = remainder.substring(1)
      }
      metricLabelText = remainder.trim() || fact.detail || ''
    } else {
      headlineText = fact.headline
    }
  } else {
    headlineText = fact.headline
  }

  return { headlineText, metricLabelText, metricSuffix }
}

const parseSecondaryMetric = (detail?: string): { value: string; label: string } | undefined => {
  if (!detail) return undefined

  const detailMatch = detail.match(/(?:With\s+)?([\d,.%]+)\s+(.+)/i)
  if (!detailMatch) return undefined

  return { value: detailMatch[1], label: detailMatch[2] }
}

export const buildBronzeCardData = (fact: BronzeFact): BronzeCardData => {
  const { headlineText, metricLabelText, metricSuffix } = parseHeadline(fact)
  // Only show secondaryMetric badge if metricLabel came from the headline (not from fact.detail)
  // When metricLabelText still equals fact.detail, showing secondaryMetric would duplicate it
  const secondaryMetric = metricLabelText === (fact.detail || '') ? undefined : parseSecondaryMetric(fact.detail)
  const variant: BronzeCardVariant = isClicksMetric(fact) ? 'secondary' : 'primary'

  // Format metric value: max 2 decimal places, append suffix (e.g. "%") if parsed from headline
  let metricValue: number | string = fact.metric_value ?? 0
  if (typeof metricValue === 'number' && metricSuffix) {
    metricValue = (Number.isInteger(metricValue)
      ? metricValue.toLocaleString()
      : metricValue.toLocaleString(undefined, { maximumFractionDigits: 2 })) + metricSuffix
  }

  return {
    platform: fact.platform,
    headline: headlineText,
    metricValue,
    metricLabel: metricLabelText,
    secondaryMetric,
    variant
  }
}
