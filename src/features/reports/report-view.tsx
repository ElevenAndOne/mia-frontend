import { useState } from 'react'
import { useSession } from '../../contexts/session-context'
import type { GenerateReportParams, TopAdMetric, TopOrganicMetric } from './types'
import {
  MONTH_OPTIONS,
  TOP_AD_METRIC_OPTIONS,
  TOP_ORGANIC_METRIC_OPTIONS,
} from './types'
import { useReports } from './hooks/use-reports'
import type { ClientReport, KpiItem, ReportSummary } from './types'

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2]

export const ReportView = () => {
  const { state } = useSession()
  const tenantId = state.activeWorkspace?.tenant_id ?? ''
  const {
    reports,
    activeReport,
    setActiveReport,
    generating,
    loadingReports,
    error,
    generate,
    openReport,
    removeReport,
  } = useReports()

  const [step, setStep] = useState<'list' | 'configure' | 'report'>('list')
  const [campaignId, setCampaignId] = useState('')
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(currentYear)
  const [topAdMetric, setTopAdMetric] = useState<TopAdMetric>('conversions')
  const [topOrganicMetric, setTopOrganicMetric] = useState<TopOrganicMetric>('engagement_rate')

  const handleGenerate = async () => {
    if (!campaignId) return
    const params: GenerateReportParams = {
      campaign_id: campaignId,
      report_month: month,
      report_year: year,
      top_ad_metric: topAdMetric,
      top_organic_metric: topOrganicMetric,
    }
    await generate(params)
    setStep('report')
  }

  const handleOpenReport = async (reportId: string) => {
    await openReport(reportId)
    setStep('report')
  }

  if (step === 'report' && activeReport) {
    return (
      <ReportPreview
        report={activeReport}
        onBack={() => {
          setActiveReport(null)
          setStep('list')
        }}
        tenantId={tenantId}
      />
    )
  }

  if (step === 'configure') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep('list')}
            className="text-tertiary hover:text-secondary paragraph-sm"
          >
            ← Back
          </button>
          <h2 className="heading-sm text-primary">New Report</h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 paragraph-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="paragraph-sm font-medium text-secondary block mb-1.5">
              Campaign ID
            </label>
            <input
              type="text"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="cmp_..."
              className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <p className="paragraph-xs text-tertiary mt-1">
              Find this in your Campaigns page
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="paragraph-sm font-medium text-secondary block mb-1.5">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="paragraph-sm font-medium text-secondary block mb-1.5">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="paragraph-sm font-medium text-secondary block mb-1.5">
              Rank top paid ad by
            </label>
            <select
              value={topAdMetric}
              onChange={(e) => setTopAdMetric(e.target.value as TopAdMetric)}
              className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {TOP_AD_METRIC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="paragraph-sm font-medium text-secondary block mb-1.5">
              Rank top organic posts by
            </label>
            <select
              value={topOrganicMetric}
              onChange={(e) => setTopOrganicMetric(e.target.value as TopOrganicMetric)}
              className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {TOP_ORGANIC_METRIC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!campaignId || generating}
          className="w-full py-3 rounded-lg bg-brand text-white paragraph-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {generating ? 'Generating report…' : 'Generate Report'}
        </button>

        {generating && (
          <p className="paragraph-xs text-tertiary text-center">
            Pulling platform data, studio hours, and generating AI sections — usually 15–30s
          </p>
        )}
      </div>
    )
  }

  // List view
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-md text-primary">Client Reports</h1>
          <p className="paragraph-sm text-tertiary mt-1">
            Monthly performance reports auto-filled from your platform data
          </p>
        </div>
        <button
          onClick={() => setStep('configure')}
          className="px-4 py-2 rounded-lg bg-brand text-white paragraph-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Report
        </button>
      </div>

      {loadingReports ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="paragraph-md text-secondary">No reports yet</p>
          <p className="paragraph-sm text-tertiary">
            Generate your first report to get started
          </p>
          <button
            onClick={() => setStep('configure')}
            className="mt-2 px-4 py-2 rounded-lg bg-brand text-white paragraph-sm font-medium hover:opacity-90 transition-opacity"
          >
            Generate Report
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <ReportListItem
              key={r.report_id}
              report={r}
              onOpen={() => handleOpenReport(r.report_id)}
              onDelete={() => removeReport(r.report_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// List item
// ---------------------------------------------------------------------------

const ReportListItem = ({
  report,
  onOpen,
  onDelete,
}: {
  report: ReportSummary
  onOpen: () => void
  onDelete: () => void
}) => (
  <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-primary bg-primary hover:bg-secondary transition-colors group">
    <button onClick={onOpen} className="flex-1 text-left space-y-0.5">
      <p className="paragraph-sm font-medium text-primary">
        {report.client_name || report.campaign_name || 'Unnamed report'}
      </p>
      <p className="paragraph-xs text-tertiary">
        {report.reporting_period_label || `${MONTH_OPTIONS[report.report_month - 1]?.label} ${report.report_year}`}
      </p>
    </button>
    <div className="flex items-center gap-2">
      <span
        className={`px-2 py-0.5 rounded-full paragraph-xs font-medium ${
          report.status === 'complete'
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}
      >
        {report.status}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (confirm('Delete this report?')) onDelete()
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-tertiary hover:text-red-500"
      >
        ×
      </button>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Report preview — all 11 sections
// ---------------------------------------------------------------------------

const ReportPreview = ({
  report,
  onBack,
  tenantId,
}: {
  report: ClientReport
  onBack: () => void
  tenantId: string
}) => {
  const data = report.report_data

  const handlePrint = () => window.print()

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={onBack} className="text-tertiary paragraph-sm mb-4">
          ← Back
        </button>
        <p className="paragraph-sm text-tertiary">Report data unavailable.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-0 print:px-0">
      {/* Actions bar — hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={onBack} className="text-tertiary hover:text-secondary paragraph-sm">
          ← All Reports
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-lg border border-primary paragraph-sm text-secondary hover:bg-secondary transition-colors"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Section 1: Cover */}
      <SectionCard title="Campaign Creative Intelligence Report" sectionNum={1}>
        <div className="space-y-1 paragraph-sm">
          <p>
            <span className="font-medium">Client Name:</span> {data.cover.client_name}
          </p>
          <p>
            <span className="font-medium">Reporting Period:</span>{' '}
            {data.cover.reporting_period_label}
          </p>
          <p>
            <span className="font-medium">Prepared by:</span> {data.cover.prepared_by}
          </p>
          <p>
            <span className="font-medium">Performance Highlight:</span>{' '}
            {data.cover.performance_highlight}
          </p>
        </div>
      </SectionCard>

      {/* Section 2: Executive Summary */}
      <SectionCard title="Executive Summary" sectionNum={2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 paragraph-sm">
          <div>
            <p className="font-medium mb-1">Campaign Status</p>
            <span
              className={`px-2 py-0.5 rounded-full paragraph-xs font-medium ${
                data.executive_summary.campaign_status === 'On Track'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {data.executive_summary.campaign_status}
            </span>
          </div>
          <div className="space-y-2">
            {data.executive_summary.key_wins.length > 0 && (
              <div>
                <p className="font-medium mb-1">Key Wins</p>
                <ul className="list-disc list-inside space-y-0.5 text-secondary">
                  {data.executive_summary.key_wins.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.executive_summary.challenges.length > 0 && (
              <div>
                <p className="font-medium mb-1">Challenges</p>
                <ul className="list-disc list-inside space-y-0.5 text-secondary">
                  {data.executive_summary.challenges.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Section 3: KPI Performance */}
      <SectionCard title="Campaign Overview & KPI Performance" sectionNum={3}>
        <div className="space-y-4 paragraph-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoField label="Objective" value={data.kpi_performance.objective} />
            <InfoField label="Duration" value={data.kpi_performance.duration} />
            <InfoField
              label="Platforms"
              value={data.kpi_performance.platforms.join(', ')}
            />
            <InfoField label="Target Audience" value={data.kpi_performance.target_audience || '—'} />
          </div>
          {data.kpi_performance.kpis.length > 0 && (
            <div>
              <p className="font-medium mb-2">Target vs. Actual</p>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-primary">
                    <th className="paragraph-xs font-medium text-tertiary pb-1 pr-3">Phase</th>
                    <th className="paragraph-xs font-medium text-tertiary pb-1 pr-3">KPI</th>
                    <th className="paragraph-xs font-medium text-tertiary pb-1 pr-3">Target</th>
                    <th className="paragraph-xs font-medium text-tertiary pb-1 pr-3">Current</th>
                    <th className="paragraph-xs font-medium text-tertiary pb-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kpi_performance.kpis.map((kpi, i) => (
                    <KpiRow key={i} kpi={kpi} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.kpi_performance.insights && (
            <p className="text-secondary paragraph-sm italic">{data.kpi_performance.insights}</p>
          )}
        </div>
      </SectionCard>

      {/* Section 4: Media Spend */}
      <SectionCard title="Media Spend Breakdown" sectionNum={4}>
        <div className="space-y-3 paragraph-sm">
          <p>
            <span className="font-medium">Total Spend:</span>{' '}
            {data.spend_breakdown.currency} {data.spend_breakdown.total_spend.toLocaleString()}
          </p>
          {data.spend_breakdown.channel_split.length > 0 && (
            <div>
              <p className="font-medium mb-2">Channel Split</p>
              <div className="space-y-1.5">
                {data.spend_breakdown.channel_split.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-28 text-secondary">{c.platform}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${c.percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-tertiary">{c.percentage}%</span>
                    <span className="w-24 text-right text-secondary">
                      {data.spend_breakdown.currency} {c.spend.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.spend_breakdown.channel_split.length === 0 && (
            <p className="text-tertiary">No spend data available for this period.</p>
          )}
          {data.spend_breakdown.insight && (
            <p className="text-secondary italic">{data.spend_breakdown.insight}</p>
          )}
        </div>
      </SectionCard>

      {/* Section 5: Top Organic Posts */}
      <SectionCard title="Top Organic Post" sectionNum={5}>
        {data.top_organic_posts.posts.length === 0 ? (
          <p className="paragraph-sm text-tertiary">
            No organic post data available. Connect your Facebook Page to enable this section.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.top_organic_posts.posts.map((post, i) => (
              <div key={i} className="border border-primary rounded-lg overflow-hidden">
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-3 space-y-2 paragraph-xs">
                  <p className="text-secondary line-clamp-3">{post.description}</p>
                  <div className="grid grid-cols-2 gap-1 text-tertiary">
                    <span>Engagement: {post.engagement_rate}%</span>
                    <span>Impressions: {post.impressions.toLocaleString()}</span>
                    <span>Clicks: {post.clicks.toLocaleString()}</span>
                    <span>Reactions: {post.reactions.toLocaleString()}</span>
                  </div>
                  {post.why_it_worked && (
                    <p className="text-secondary italic">"{post.why_it_worked}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Section 6: Audience Insights */}
      <SectionCard title="Audience Insights" sectionNum={6}>
        {!data.audience_insights.age_groups?.length ? (
          <p className="paragraph-sm text-tertiary">
            No audience data available. Connect Meta Ads to enable this section.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 paragraph-sm">
            <div>
              <p className="font-medium mb-2">Age Groups</p>
              <div className="space-y-1">
                {data.audience_insights.age_groups.map((a, i) => (
                  <div key={i} className="flex justify-between text-secondary">
                    <span>{a.range}</span>
                    <span>{a.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Gender Split</p>
              <div className="space-y-1">
                {Object.entries(data.audience_insights.gender_split ?? {}).map(([g, pct]) => (
                  <div key={g} className="flex justify-between text-secondary">
                    <span className="capitalize">{g}</span>
                    <span>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Top Locations</p>
              <div className="space-y-1">
                {data.audience_insights.top_locations?.map((l, i) => (
                  <div key={i} className="flex justify-between text-secondary">
                    <span>{l.location}</span>
                    <span>{l.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Section 7: Studio Hours */}
      <SectionCard title="Studio Hours" sectionNum={7}>
        {data.studio_hours.source === 'not_linked' ? (
          <p className="paragraph-sm text-tertiary">
            Link this campaign to a ClickUp list to auto-populate studio hours.
          </p>
        ) : data.studio_hours.total_hours === 0 ? (
          <p className="paragraph-sm text-tertiary">No time tracked for this period.</p>
        ) : (
          <div className="space-y-3 paragraph-sm">
            <p>
              <span className="font-medium">Total Hours Used:</span>{' '}
              {data.studio_hours.total_hours}h
            </p>
            <div>
              <p className="font-medium mb-2">Breakdown of Hours</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(data.studio_hours.breakdown).map(([cat, hrs]) => (
                  <div key={cat} className="border border-primary rounded-lg p-3 text-center">
                    <p className="paragraph-xs text-tertiary">{cat}</p>
                    <p className="paragraph-md font-medium text-primary mt-0.5">{hrs}h</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Section 8: Testing & Learnings */}
      <SectionCard title="Testing & Learnings" sectionNum={8}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.testing_learnings.tests.map((test, i) => (
            <div key={i} className="border border-primary rounded-lg p-4 space-y-2 paragraph-sm">
              <p className="font-medium">A/B Test {i + 1}: Result & learning</p>
              <EditableField
                label="What was tested?"
                value={test.what_tested}
                placeholder="[Insert]"
              />
              <EditableField
                label="Testing period:"
                value={test.testing_period}
                placeholder="[Insert]"
              />
              <EditableField label="Result:" value={test.result} placeholder="[Insert]" />
              <EditableField
                label="Learnings:"
                value={test.learnings}
                placeholder="[Insert]"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Section 9: Risks & Recommendations */}
      <SectionCard title="Risks & Recommendations" sectionNum={9}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 paragraph-sm">
          <div className="border border-primary rounded-lg p-4 space-y-3">
            <p className="font-medium">Risks & Considerations</p>
            <div>
              <p className="font-medium text-tertiary mb-0.5">Market Risks</p>
              <p className="text-secondary">{data.risks_recommendations.market_risks || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-tertiary mb-0.5">Platform Risks</p>
              <p className="text-secondary">{data.risks_recommendations.platform_risks || '—'}</p>
            </div>
          </div>
          <div className="border border-primary rounded-lg p-4 space-y-3">
            <p className="font-medium">Recommendations</p>
            <div>
              <p className="font-medium text-tertiary mb-0.5">Immediate Actions</p>
              <p className="text-secondary">
                {data.risks_recommendations.immediate_actions || '—'}
              </p>
            </div>
            <div>
              <p className="font-medium text-tertiary mb-0.5">Future Opportunities</p>
              <p className="text-secondary">
                {data.risks_recommendations.future_opportunities || '—'}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Section 10: Next Month Plan */}
      <SectionCard title="Next Month Plan" sectionNum={10}>
        <div className="space-y-3 paragraph-sm">
          <div>
            <p className="font-medium">Focus Areas</p>
            <p className="text-secondary mt-0.5">
              {data.next_month_plan.focus_areas || '—'}
            </p>
          </div>
          <div>
            <p className="font-medium">Upcoming Actions</p>
            <p className="text-secondary mt-0.5">
              {data.next_month_plan.upcoming_actions || '[Insert]'}
            </p>
          </div>
          <div>
            <p className="font-medium">Next Month Budget</p>
            <p className="text-secondary mt-0.5">
              {data.next_month_plan.next_month_budget > 0
                ? `R ${data.next_month_plan.next_month_budget.toLocaleString()}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="font-medium">Future Testing</p>
            <p className="text-secondary mt-0.5">
              {data.next_month_plan.future_testing || '[Insert]'}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Section 11: Dashboard */}
      <SectionCard title="Campaign Performance Dashboard" sectionNum={11}>
        <div className="space-y-4 paragraph-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-medium">Campaign Health:</span>
              <span
                className={`px-3 py-1 rounded-full paragraph-sm font-medium ${
                  data.dashboard.campaign_health.status === 'On Track'
                    ? 'bg-green-100 text-green-700'
                    : data.dashboard.campaign_health.status === 'Mixed'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {data.dashboard.campaign_health.status}
              </span>
            </div>
            <p className="text-secondary">{data.dashboard.campaign_health.description}</p>
          </div>

          {data.dashboard.key_takeaways.length > 0 && (
            <div>
              <p className="font-medium mb-2">Key Takeaways</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.dashboard.key_takeaways.map((t, i) => (
                  <div key={i} className="flex gap-2 p-3 rounded-lg bg-secondary">
                    <span className="text-brand font-medium shrink-0">{i + 1}.</span>
                    <p className="text-secondary">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.dashboard.next_steps.length > 0 && (
            <div>
              <p className="font-medium mb-2">Next Steps</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {data.dashboard.next_steps.map((s, i) => (
                  <div key={i} className="border border-primary rounded-lg p-3 text-center">
                    <p className="font-medium text-brand">{s.label}</p>
                    <p className="paragraph-xs text-tertiary mt-0.5">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-tertiary paragraph-xs">
            Next report: {data.dashboard.next_report_period}
          </p>
        </div>
      </SectionCard>

      {/* Print footer */}
      <div className="hidden print:block text-center pt-8 border-t border-primary paragraph-xs text-tertiary">
        <p>Thank you for your continued trust and partnership. Let's keep building momentum!</p>
        <p className="mt-1 font-medium">11&1 Agency</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const SectionCard = ({
  title,
  sectionNum,
  children,
}: {
  title: string
  sectionNum: number
  children: React.ReactNode
}) => (
  <div className="border border-primary rounded-xl p-6 mb-4 bg-primary print:break-inside-avoid">
    <div className="flex items-start gap-3 mb-4">
      <span className="paragraph-xs text-tertiary shrink-0">Section {sectionNum}</span>
      <h2 className="heading-sm text-primary">{title}</h2>
    </div>
    {children}
  </div>
)

const InfoField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="paragraph-xs text-tertiary font-medium">{label}</p>
    <p className="text-secondary mt-0.5">{value || '—'}</p>
  </div>
)

const EditableField = ({
  label,
  value,
  placeholder,
}: {
  label: string
  value: string
  placeholder: string
}) => (
  <div>
    <span className="font-medium">{label} </span>
    <span className={value ? 'text-secondary' : 'text-tertiary'}>{value || placeholder}</span>
  </div>
)

const KpiRow = ({ kpi }: { kpi: KpiItem }) => {
  const statusColor =
    kpi.status === 'on_track'
      ? 'text-green-600'
      : kpi.status === 'close'
        ? 'text-yellow-600'
        : kpi.status === 'behind'
          ? 'text-red-600'
          : 'text-tertiary'

  return (
    <tr className="border-b border-primary last:border-0">
      <td className="paragraph-xs text-tertiary py-1.5 pr-3">{kpi.phase}</td>
      <td className="paragraph-xs text-secondary py-1.5 pr-3">{kpi.kpi}</td>
      <td className="paragraph-xs text-secondary py-1.5 pr-3">{kpi.target || '—'}</td>
      <td className="paragraph-xs text-secondary py-1.5 pr-3">{kpi.current || '—'}</td>
      <td className={`paragraph-xs py-1.5 font-medium ${statusColor}`}>
        {kpi.status === 'on_track' ? '✓' : kpi.status === 'behind' ? '↓' : kpi.status === 'close' ? '~' : '—'}
      </td>
    </tr>
  )
}
