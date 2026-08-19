import { AtAGlance } from './at-a-glance'
import { DeliverableTabs } from './deliverable-tabs'
import { ExecSummary } from './exec-summary'
import { InsightRow } from './insight-row'
import { RecommendationCard } from './recommendation-card'
import { SectionHeader } from './section-header'
import { TopPosts } from './top-posts'
import type { GoldTopPost, StructuredGoldReport } from './types'
import './gold-report.css'

// The designed rendition of the gold ML report (Figma: MIA-Gold-Data).
// Sections tolerate partial payloads — anything empty is simply omitted.
// `title` swaps the heading for the organic tier (same layout, same schema).
// Inverted pyramid: at-a-glance tiles and the actual posts sit above the
// long-form sections, so a 15-second read still lands the story.
export const StructuredReport = ({
  report,
  title = 'ML Prediction Report',
  topPosts = [],
}: {
  report: StructuredGoldReport
  title?: string
  topPosts?: GoldTopPost[]
}) => {
  const { executive_summary, insights, recommendations, deliverables } = report
  return (
    <div className="gold-report space-y-8">
      <div className="space-y-1">
        <h1
          className="flex items-center gap-2.5 text-[28px] leading-10 font-semibold tracking-[-0.01em]"
          style={{ color: 'var(--gr-heading)' }}
        >
          <svg
            className="w-6 h-6 shrink-0"
            viewBox="0 0 20 20"
            fill="#f0a63e"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M10 2L12.39 7.26L18 8.27L14 12.14L14.76 18L10 15.27L5.24 18L6 12.14L2 8.27L7.61 7.26L10 2Z" />
          </svg>
          {title}
        </h1>
        {report.intro && (
          <p className="text-base leading-[22px]" style={{ color: 'var(--gr-subtle)' }}>
            {report.intro}
          </p>
        )}
      </div>

      {report.email_digest && <AtAGlance digest={report.email_digest} />}

      {topPosts.length > 0 && (
        <section>
          <SectionHeader
            index=""
            eyebrow="The posts behind the numbers"
            title="See the actual content"
          />
          <TopPosts posts={topPosts} />
        </section>
      )}

      <section>
        <SectionHeader
          index="01"
          eyebrow="Executive Summary"
          title={executive_summary.headline}
          titleWeight="normal"
        />
        <ExecSummary summary={executive_summary} />
      </section>

      {insights.length > 0 && (
        <section>
          <SectionHeader
            index="02"
            eyebrow="Insights"
            title="What's driving performance"
            note="Ranked by driver strength"
          />
          <div className="gr-card divide-y divide-[color:var(--gr-line)]">
            {insights.map((insight, i) => (
              <InsightRow key={i} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <section>
          <SectionHeader
            index="03"
            eyebrow="Recommendations & Predictions"
            title="Where to point budget next"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        </section>
      )}

      {deliverables.length > 0 && (
        <section>
          <SectionHeader
            index="04"
            eyebrow="Design Actions & Deliverables"
            title="What to build next"
          />
          <DeliverableTabs deliverables={deliverables} />
        </section>
      )}
    </div>
  )
}
