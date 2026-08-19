import { useState } from 'react'
import { AtAGlance } from './at-a-glance'
import { CampaignEvidence } from './campaign-evidence'
import { DoNext } from './do-next'
import { ExecSummary } from './exec-summary'
import { CollapsibleRow } from './collapsible-row'
import { DeliverableRows, InsightRows, RecommendationRows } from './report-rows'
import { TopPosts } from './top-posts'
import type { GoldCampaignEvidence, GoldTopPost, StructuredGoldReport } from './types'
import './gold-report.css'

// Section eyebrow with an optional count — plain language over report jargon.
const Section = ({
  label,
  count,
  children,
}: {
  label: string
  count?: number
  children: React.ReactNode
}) => (
  <section>
    <p className="gr-eyebrow mb-2">
      {label}
      {count != null && ` · ${count}`}
    </p>
    {children}
  </section>
)

interface StructuredReportProps {
  report: StructuredGoldReport
  /** Heading — swaps for the organic tier. */
  title?: string
  /** Organic tier: real posts behind the numbers. */
  topPosts?: GoldTopPost[]
  /** Paid tier: real campaign metrics from the ad platforms. */
  campaignEvidence?: GoldCampaignEvidence | null
}

/**
 * The designed report (Figma: MIA-Gold-Data), structured as an inverted
 * pyramid: the numbers and the actions read in about a minute, and every
 * long-form section is a disclosure row that opens in place. Nothing is
 * removed — "Expand all" reveals the whole report for a full read or print.
 *
 * Both tiers render through here; only the evidence section differs (linked
 * posts for organic, campaign metrics for paid), because both produce the
 * same report JSON.
 */
export const StructuredReport = ({
  report,
  title = 'ML Prediction Report',
  topPosts = [],
  campaignEvidence,
}: StructuredReportProps) => {
  const { executive_summary, insights, recommendations, deliverables, email_digest } = report
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined)

  return (
    <div className="gold-report space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1
          className="flex items-center gap-2.5 text-[24px] leading-8 font-semibold tracking-[-0.01em]"
          style={{ color: 'var(--gr-heading)' }}
        >
          <svg
            className="w-5 h-5 shrink-0"
            viewBox="0 0 20 20"
            fill="#f0a63e"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M10 2L12.39 7.26L18 8.27L14 12.14L14.76 18L10 15.27L5.24 18L6 12.14L2 8.27L7.61 7.26L10 2Z" />
          </svg>
          {title}
        </h1>
        <button
          type="button"
          onClick={() => setExpandAll((v) => !v)}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
          style={{
            color: 'var(--gr-purple-text)',
            backgroundColor: 'var(--gr-purple-tint)',
          }}
        >
          {expandAll ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {email_digest ? (
        <AtAGlance digest={email_digest} />
      ) : (
        // Reports structured before the digest existed still get a summary.
        <ExecSummary summary={executive_summary} />
      )}

      {email_digest && email_digest.next_steps_short.length > 0 && (
        <Section label="Do this next">
          <DoNext steps={email_digest.next_steps_short} />
        </Section>
      )}

      {topPosts.length > 0 && (
        <Section label="The posts behind the numbers">
          <TopPosts posts={topPosts} />
        </Section>
      )}

      {campaignEvidence && campaignEvidence.campaigns.length > 0 && (
        <Section label="The campaigns behind the numbers">
          <CampaignEvidence evidence={campaignEvidence} />
        </Section>
      )}

      {insights.length > 0 && (
        <Section label="What's driving performance" count={insights.length}>
          <InsightRows insights={insights} forceOpen={expandAll} />
        </Section>
      )}

      {recommendations.length > 0 && (
        <Section label="What to do about it" count={recommendations.length}>
          <RecommendationRows recommendations={recommendations} forceOpen={expandAll} />
        </Section>
      )}

      {deliverables.length > 0 && (
        <Section label="Content to make" count={deliverables.length}>
          <DeliverableRows deliverables={deliverables} forceOpen={expandAll} />
        </Section>
      )}

      {email_digest && (
        <Section label="Full summary">
          <div className="gr-card overflow-hidden">
            <CollapsibleRow title="Read the full written summary" forceOpen={expandAll}>
              <ExecSummary summary={executive_summary} />
            </CollapsibleRow>
          </div>
        </Section>
      )}
    </div>
  )
}
