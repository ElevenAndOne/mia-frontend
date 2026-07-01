import { useState, useEffect } from 'react'
import { useSession } from '../../contexts/session-context'
import { trackEvent } from '../../utils/tracking'
import { TopBar } from '../../components/top-bar'
import type { CampaignOption } from './services/report-service'
import { listCampaignOptions, getClickUpSpaces } from './services/report-service'
import type { GenerateReportParams, TopAdMetric, TopOrganicMetric, ClickUpSpace } from './types'
import { TOP_AD_METRIC_OPTIONS, TOP_ORGANIC_METRIC_OPTIONS } from './types'
import { useReports } from './hooks/use-reports'
import type { ReportSummary } from './types'
import { ReportOnePager } from './report-onepager'

// Local-timezone-safe YYYY-MM-DD (avoids the UTC off-by-one from toISOString)
const toISODate = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000)
  return local.toISOString().slice(0, 10)
}
const _today = new Date()
const DEFAULT_END = toISODate(_today)
const DEFAULT_START = toISODate(new Date(_today.getFullYear(), _today.getMonth(), 1))

const PLATFORM_LABELS: Record<string, string> = {
  meta_ads: 'Meta',
  google_ads: 'Google',
  organic_social: 'Organic',
  email: 'Email',
  linkedin_ads: 'LinkedIn',
  linkedin_organic: 'LinkedIn Organic',
  tiktok_ads: 'TikTok',
}

export const ReportView = ({ onBack }: { onBack?: () => void }) => {
  const { activeWorkspace, sessionId } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? ''
  const {
    reports,
    activeReport,
    setActiveReport,
    generating,
    loadingReports,
    error,
    generate,
    openReport,
    saveOverrides,
    removeReport,
  } = useReports()

  const [step, setStep] = useState<'list' | 'configure' | 'report'>('list')
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [spaces, setSpaces] = useState<ClickUpSpace[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(false)

  const [campaignId, setCampaignId] = useState('')
  const [startDate, setStartDate] = useState(DEFAULT_START)
  const [endDate, setEndDate] = useState(DEFAULT_END)
  const [topAdMetric, setTopAdMetric] = useState<TopAdMetric>('ctr')
  const [topOrganicMetric, setTopOrganicMetric] = useState<TopOrganicMetric>('engagement_rate')
  const [selectedSpaceId, setSelectedSpaceId] = useState('')
  const [selectedListId, setSelectedListId] = useState('')

  const selectedCampaign = campaigns.find((c) => c.campaign_id === campaignId) ?? null
  const selectedSpace = spaces.find((s) => s.space_id === selectedSpaceId) ?? null
  const availableLists = selectedSpace?.lists ?? []

  useEffect(() => {
    trackEvent(sessionId, 'page_visit', 'reports')
  }, [sessionId])

  // Load campaigns + ClickUp spaces when configure step opens
  useEffect(() => {
    if (step !== 'configure' || !tenantId || !sessionId) return
    if (campaigns.length === 0) {
      setLoadingCampaigns(true)
      listCampaignOptions(sessionId, tenantId)
        .then(setCampaigns)
        .finally(() => setLoadingCampaigns(false))
    }
    if (spaces.length === 0) {
      setLoadingSpaces(true)
      getClickUpSpaces(sessionId, tenantId)
        .then(setSpaces)
        .finally(() => setLoadingSpaces(false))
    }
  }, [step, tenantId, sessionId, campaigns.length, spaces.length])

  // When campaign changes, pre-select its linked ClickUp list if any
  useEffect(() => {
    if (!selectedCampaign) {
      setSelectedSpaceId('')
      setSelectedListId('')
      return
    }
    const linkedListId = selectedCampaign.clickup_list_id
    if (!linkedListId) {
      setSelectedListId('')
      setSelectedSpaceId('')
      return
    }
    setSelectedListId(linkedListId)
    const parentSpace = spaces.find((s) => s.lists.some((l) => l.list_id === linkedListId))
    if (parentSpace) setSelectedSpaceId(parentSpace.space_id)
  }, [campaignId, selectedCampaign, spaces])

  // Reset list when space changes (unless it belongs to new space)
  const handleSpaceChange = (spaceId: string) => {
    setSelectedSpaceId(spaceId)
    const space = spaces.find((s) => s.space_id === spaceId)
    const listStillValid = space?.lists.some((l) => l.list_id === selectedListId) ?? false
    if (!listStillValid) setSelectedListId('')
  }

  const handleGenerate = async () => {
    if (!campaignId) return
    if (!startDate || !endDate || endDate < startDate) return
    const params: GenerateReportParams = {
      campaign_id: campaignId,
      start_date: startDate,
      end_date: endDate,
      top_ad_metric: topAdMetric,
      top_organic_metric: topOrganicMetric,
      clickup_list_id: selectedListId || undefined,
    }
    const report = await generate(params)
    // Only advance to the report view if the POST succeeded; otherwise stay on the
    // configure step so the error banner is visible.
    if (report) setStep('report')
  }

  const handleOpenReport = async (reportId: string) => {
    await openReport(reportId)
    setStep('report')
  }

  if (step === 'report' && activeReport) {
    const backToList = () => {
      setActiveReport(null)
      setStep('list')
    }

    // Report still generating on the backend — show progress, poll runs in the hook.
    if (activeReport.status === 'generating' || (!activeReport.report_data && !error)) {
      return (
        <div className="flex flex-col h-full">
          <TopBar title="Client Reports" onBack={backToList} />
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center space-y-4 max-w-sm">
              <div className="mx-auto h-10 w-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <p className="paragraph-md font-medium text-primary">Generating your report…</p>
              <p className="paragraph-sm text-tertiary">
                Pulling platform data, studio hours, and generating AI sections — this usually takes
                around a minute, sometimes a little longer. You can leave this page; it’ll keep
                generating and show up in your reports list.
              </p>
              <button
                onClick={backToList}
                className="paragraph-sm text-tertiary hover:text-secondary"
              >
                ← Back to reports
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Generation failed (or timed out) — surface the error with a way out.
    if (activeReport.status === 'failed' || (!activeReport.report_data && error)) {
      return (
        <div className="flex flex-col h-full">
          <TopBar title="Client Reports" onBack={backToList} />
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center space-y-4 max-w-sm">
              <p className="paragraph-md font-medium text-primary">Report generation failed</p>
              <p className="paragraph-sm text-tertiary">
                {error || 'Something went wrong while generating this report. Please try again.'}
              </p>
              <button
                onClick={() => setStep('configure')}
                className="px-4 py-2 rounded-lg bg-brand text-white paragraph-sm font-medium hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
              <div>
                <button
                  onClick={backToList}
                  className="paragraph-sm text-tertiary hover:text-secondary"
                >
                  ← Back to reports
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <ReportOnePager
        report={activeReport}
        onBack={backToList}
        saveOverrides={saveOverrides}
      />
    )
  }

  if (step === 'configure') {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-xl mx-auto w-full px-4 py-8 space-y-6">
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
          {/* Campaign */}
          <div>
            <label className="paragraph-sm font-medium text-secondary block mb-1.5">
              Campaign
            </label>
            {loadingCampaigns ? (
              <div className="w-full h-10 rounded-lg bg-secondary animate-pulse" />
            ) : (
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">Select a campaign…</option>
                {campaigns.map((c) => (
                  <option key={c.campaign_id} value={c.campaign_id}>
                    {c.client_name ? `${c.client_name} — ` : ''}{c.campaign_name}
                  </option>
                ))}
              </select>
            )}
            {selectedCampaign?.channels && selectedCampaign.channels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedCampaign.channels.map((ch) => (
                  <span
                    key={ch}
                    className="px-2 py-0.5 rounded-full bg-secondary text-secondary paragraph-xs"
                  >
                    {PLATFORM_LABELS[ch] ?? ch}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reporting period — any date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="paragraph-sm font-medium text-secondary block mb-1.5">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="paragraph-sm font-medium text-secondary block mb-1.5">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          {endDate && startDate && endDate < startDate && (
            <p className="paragraph-sm text-red-500 mt-1.5">
              End date must be on or after the start date.
            </p>
          )}

          {/* ClickUp Studio Hours */}
          <div>
            <label className="paragraph-sm font-medium text-secondary block mb-1.5">
              Studio Hours source{' '}
              <span className="font-normal text-tertiary">(optional)</span>
            </label>
            {loadingSpaces ? (
              <div className="w-full h-10 rounded-lg bg-secondary animate-pulse" />
            ) : spaces.length === 0 ? (
              <p className="paragraph-xs text-tertiary">ClickUp not connected</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={selectedSpaceId}
                  onChange={(e) => handleSpaceChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Space…</option>
                  {spaces.map((s) => (
                    <option key={s.space_id} value={s.space_id}>
                      {s.space_name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  disabled={!selectedSpaceId}
                  className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-40"
                >
                  <option value="">List…</option>
                  {availableLists.map((l) => (
                    <option key={l.list_id} value={l.list_id}>
                      {l.list_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedListId && (
              <p className="paragraph-xs text-tertiary mt-1.5">
                This list will be saved to the campaign for future reports.
              </p>
            )}
          </div>

          {/* Metric pickers */}
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
            Pulling platform data, studio hours, and generating AI sections — this usually takes
            around a minute, sometimes a little longer.
          </p>
        )}
      </div>
      </div>
    )
  }

  // List view
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Client Reports" onBack={onBack} />
      <div className="flex-1 overflow-y-auto">
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
    </div>
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
        {report.reporting_period_label ||
          (report.period_start && report.period_end
            ? `${report.period_start} – ${report.period_end}`
            : '—')}
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
