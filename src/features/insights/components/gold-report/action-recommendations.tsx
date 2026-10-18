import type { ReactNode } from 'react'
import { Badge } from './badges'
import { CollapsibleRow } from './collapsible-row'
import { InlineMd } from './inline-md'
import { count, metricName, metricValue, money, pct } from './format'
import type { GoldActionRecommendation, GoldActionTest } from './types'

// "Do this next" straight from the report's built recommendations (pipeline
// `action_recommendations`, section 3), replacing the LLM re-parse that dropped their
// evidence and mixed in section 4's execution notes. Every card is the action, why
// (from the evidence fields, per kind) and how to test it. A kind this page does not
// know shows its action and test only — the "why" is never invented.

const KIND_LABELS: Record<string, string> = {
  replicate_standout: 'Repeat a winner',
  apply_creative_pattern: 'Creative pattern',
  repeat_organic_outlier: 'Organic winner',
  test_competitor_ad_angle: 'Competitor angle',
  commercial_terms: 'Terms',
  test_channel_gap: 'New channel',
  answer_promotion: 'Promotion',
}

const BASIS_NOTES: Record<string, string> = {
  measured: 'From your own results',
  competitor_observed: 'Prompted by a competitor',
}

const ExternalLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer noopener"
    className="underline underline-offset-2"
    style={{ color: 'var(--gr-purple-text)' }}
  >
    {children}
  </a>
)

const has = (n: number | null | undefined): n is number => typeof n === 'number'

// The stored action text names the reader in the third person ("the client's best ad");
// the written report substitutes the business name, the page speaks to the reader.
const readerVoice = (text: string): string =>
  text.replace(/\bthe client's\b/gi, 'your').replace(/\bthe client\b/gi, 'you')

/** "R51.84 per thousand impressions against R17.60; ..." — only pairs with both sides. */
const costComparison = (rec: GoldActionRecommendation, currency?: string | null): string | null => {
  const pairs: [number | null | undefined, number | null | undefined, string][] = [
    [rec.with_cpm, rec.without_cpm, 'per thousand impressions'],
    [rec.with_cost_per_landing_view, rec.without_cost_per_landing_view, 'per landing-page visit'],
    [rec.with_cost_per_click, rec.without_cost_per_click, 'per link click'],
  ]
  const parts = pairs
    .filter((p): p is [number, number, string] => has(p[0]) && has(p[1]))
    .map(([w, wo, unit]) => `${money(w, currency)} ${unit} against ${money(wo, currency)}`)
  return parts.length ? parts.join('; ') : null
}

/** The evidence behind a recommendation, in a sentence or two. Null for unknown kinds. */
const why = (rec: GoldActionRecommendation, currency?: string | null): ReactNode => {
  switch (rec.kind) {
    case 'replicate_standout': {
      if (!has(rec.observed_value)) return null
      const costs = costComparison(rec, currency)
      const apart = (rec.distinguishing ?? []).filter(Boolean)
      return (
        <>
          {rec.creative ? <>&ldquo;{rec.creative}&rdquo; reached </> : 'It reached '}
          {pct(rec.observed_value)} link CTR
          {has(rec.observed_impressions) && <> on {count(rec.observed_impressions)} impressions</>}
          {has(rec.best_peer_value) && (
            <>; the best of the creatives it ran alongside managed {pct(rec.best_peer_value)}</>
          )}
          {has(rec.peer_median_value) && <> (median {pct(rec.peer_median_value)})</>}.
          {apart.length > 0 && <> What sets it apart: {apart.join('; ')}.</>}
          {costs && <> Cost against the median of the others: {costs}.</>}
          {rec.trade_off && <> Trade-off: {readerVoice(rec.trade_off).replace(/\.?$/, '.')}</>}
        </>
      )
    }
    case 'apply_creative_pattern':
      if (!rec.attribute || !has(rec.observed_value) || !has(rec.without_value)) return null
      return (
        <>
          Ads that {rec.attribute} ran at {pct(rec.observed_value)} CTR against{' '}
          {pct(rec.without_value)} for the rest
          {has(rec.with_ads) && has(rec.without_ads) && (
            <>
              {' '}
              ({rec.with_ads} vs {rec.without_ads} ads)
            </>
          )}
          .
        </>
      )
    case 'repeat_organic_outlier':
      if (!has(rec.views)) return null
      return (
        <>
          Your {rec.platform ?? ''} post reached {count(rec.views)} views
          {has(rec.median_views) && <> against a usual {count(rec.median_views)}</>}
          {rec.opening && <>: &ldquo;{rec.opening}&rdquo;</>}.{' '}
          {rec.permalink && <ExternalLink href={rec.permalink}>View the post</ExternalLink>}
        </>
      )
    case 'test_competitor_ad_angle':
      if (!rec.competitor || !(rec.headline || rec.description)) return null
      return (
        <>
          {rec.competitor}&rsquo;s {rec.platform ?? 'Google'} ad
          {has(rec.days_shown) && <>, running {rec.days_shown} days</>}:{' '}
          <span style={{ color: 'var(--gr-heading)' }}>
            &ldquo;{[rec.headline, rec.description].filter(Boolean).join(' — ')}&rdquo;
          </span>{' '}
          {rec.transparency_link && (
            <ExternalLink href={rec.transparency_link}>View in the ad library</ExternalLink>
          )}
        </>
      )
    case 'commercial_terms':
      if (!has(rec.own_threshold) || !rec.competitor_thresholds?.length) return null
      return (
        <>
          Your free-delivery threshold is {money(rec.own_threshold, currency)};{' '}
          {rec.competitor_thresholds
            .map((c) => `${c.name} ${money(c.threshold, currency)}`)
            .join(', ')}
          .
        </>
      )
    case 'test_channel_gap':
      if (!rec.channel || !rec.competitors?.length) return null
      return (
        <>
          {rec.competitors.join(', ')} {rec.competitors.length === 1 ? 'is' : 'are'} advertising on{' '}
          {rec.channel}.
        </>
      )
    case 'answer_promotion':
      if (!rec.competitor || !rec.promotion) return null
      return (
        <>
          {rec.competitor} put up &ldquo;{rec.promotion}&rdquo;
          {rec.uploaded && <> ({rec.uploaded})</>}.{' '}
          {rec.asset_url && <ExternalLink href={rec.asset_url}>See the image</ExternalLink>}
        </>
      )
    default:
      return null
  }
}

/** The test as short facts: how big, how long, what counts as a win. */
const testLines = (test: GoldActionTest, currency?: string | null): string[] => {
  if (test.decision_only) return ['A decision to make, not a test to run.']
  const size: string[] = []
  if (has(test.impressions_per_version))
    size.push(`${count(test.impressions_per_version)} impressions per version`)
  if (has(test.clicks)) size.push(`${count(test.clicks)} clicks`)
  if (has(test.posts)) size.push(`${test.posts} posts`)
  if (has(test.min_days)) size.push(`at least ${test.min_days} days`)
  if (has(test.spend_per_version))
    size.push(`about ${money(test.spend_per_version, currency)} per version`)
  if (has(test.spend)) size.push(`about ${money(test.spend, currency)}`)

  const lines: string[] = []
  if (size.length) lines.push(size.join(' · '))
  if (has(test.target_value)) {
    const target = metricValue(test.metric, test.target_value, currency)
    const control = has(test.control_value)
      ? ` against ${metricValue(test.metric, test.control_value, currency)}${
          test.control_creative ? ` for “${test.control_creative}”` : ''
        }`
      : ''
    lines.push(`Aim for ${target} ${metricName(test.metric)}${control}`)
  }
  if (test.success_rule) lines.push(`Keep it: ${readerVoice(test.success_rule)}`)
  if (test.stop_rule) lines.push(`Stop: ${readerVoice(test.stop_rule)}`)
  return lines
}

const SubLabel = ({ children }: { children: ReactNode }) => (
  <p
    className="text-[0.6563rem] font-bold tracking-[0.06em] uppercase mb-0.5"
    style={{ color: 'var(--gr-muted)' }}
  >
    {children}
  </p>
)

export const ActionRecommendationRows = ({
  recommendations,
  currency,
  forceOpen,
}: {
  recommendations: GoldActionRecommendation[]
  currency?: string | null
  forceOpen?: boolean
}) => {
  const ordered = [...recommendations].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  return (
    <div className="gr-card overflow-hidden">
      {ordered.map((rec, i) => {
        const reason = why(rec, currency)
        const test = rec.test ? testLines(rec.test, currency) : []
        return (
          <CollapsibleRow
            key={`${rec.kind}-${i}`}
            lead={<Badge label={KIND_LABELS[rec.kind] ?? rec.kind.replace(/_/g, ' ')} />}
            title={readerVoice(rec.action.replace(/\*\*/g, ''))}
            forceOpen={forceOpen}
          >
            <div className="space-y-2.5">
              {BASIS_NOTES[rec.basis] && (
                <p className="text-[0.6875rem] leading-4" style={{ color: 'var(--gr-muted)' }}>
                  {BASIS_NOTES[rec.basis]}
                </p>
              )}
              {reason && (
                <div>
                  <SubLabel>Why</SubLabel>
                  <p className="text-[0.8438rem] leading-5" style={{ color: 'var(--gr-body)' }}>
                    {reason}
                  </p>
                </div>
              )}
              {test.length > 0 && (
                <div className="gr-predict py-2.5 px-3">
                  <p
                    className="text-[0.6563rem] font-bold tracking-[0.06em] uppercase mb-0.5"
                    style={{ color: 'var(--gr-green)' }}
                  >
                    How to test
                  </p>
                  <ul className="space-y-0.5">
                    {test.map((line, j) => (
                      <li
                        key={j}
                        className="text-[0.8125rem] leading-[1.1875rem]"
                        style={{ color: 'var(--gr-body)' }}
                      >
                        <InlineMd text={line} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleRow>
        )
      })}
    </div>
  )
}
