import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Crumb } from '../../components/breadcrumbs'
import { useSession } from '../../contexts/session-context'
import { useToast } from '../../contexts/toast-context'
import { trackEvent } from '../../utils/tracking'
import { TopBar } from '../../components/top-bar'
import type { CampaignOption } from './services/report-service'
import {
  listCampaignOptions,
  listKpiTargetOptions,
} from './services/report-service'
import type {
  GenerateReportParams,
  KpiTargetOption,
  TopAdMetric,
  TopOrganicMetric,
} from './types'
import { TOP_AD_METRIC_OPTIONS, TOP_ORGANIC_METRIC_OPTIONS } from './types'
import { useReports } from './hooks/use-reports'
import type { ReportSummary } from './types'
import { ReportOnePager } from './report-onepager'
import { DateBox, SelectBox } from './form-fields'

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
  const { showToast } = useToast()
  const tenantId = activeWorkspace?.tenant_id ?? ''
  const {
    reports,
    activeReport,
    setActiveReport,
    generating,
    loadingReports,
    error,
    listError,
    reloadReports,
    generate,
    openReport,
    saveOverrides,
    removeReport,
  } = useReports()

  // The open report and a new-report start live in the address (19 Nov 2026): ?report=<id>, or
  // ?new=1&campaign=<id> (the builder's Results tab links here). A refresh keeps the report open
  // and the breadcrumb "Reports" goes back to the list.
  const [searchParams, setSearchParams] = useSearchParams()
  const reportParam = searchParams.get('report')
  const [step, setStep] = useState<'list' | 'configure' | 'report'>(() =>
    searchParams.get('report') ? 'report' : searchParams.get('new') ? 'configure' : 'list'
  )
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  const [campaignId, setCampaignId] = useState('')
  const [nudgeCampaign, setNudgeCampaign] = useState(false)
  const campaignSelect = useRef<HTMLSelectElement>(null)
  const [startDate, setStartDate] = useState(DEFAULT_START)
  const [endDate, setEndDate] = useState(DEFAULT_END)
  const [topAdMetric, setTopAdMetric] = useState<TopAdMetric>('ctr')
  const [topOrganicMetric, setTopOrganicMetric] = useState<TopOrganicMetric>('engagement_rate')
  const [kpiOptions, setKpiOptions] = useState<KpiTargetOption[]>([])
  const [loadingKpis, setLoadingKpis] = useState(false)
  const [windowTargets, setWindowTargets] = useState<Record<string, string>>({})
  const [campaignSpan, setCampaignSpan] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  })

  const selectedCampaign = campaigns.find((c) => c.campaign_id === campaignId) ?? null

  useEffect(() => {
    trackEvent(sessionId, 'page_visit', 'reports')
  }, [sessionId])

  // Load campaigns when the configure step opens (the ClickUp picker went 19 Nov 2026)
  useEffect(() => {
    if (step !== 'configure' || !tenantId || !sessionId) return
    if (campaigns.length === 0) {
      setLoadingCampaigns(true)
      listCampaignOptions(sessionId, tenantId)
        .then(setCampaigns)
        .catch(() => showToast('error', "Couldn't load campaigns. Please try again."))
        .finally(() => setLoadingCampaigns(false))
    }
  }, [step, tenantId, sessionId, campaigns.length, showToast])

  // Load the campaign's KPIs so a target can be set per KPI for this window.
  useEffect(() => {
    if (!campaignId || !tenantId || !sessionId) {
      setKpiOptions([])
      setWindowTargets({})
      setCampaignSpan({ start: null, end: null })
      return
    }
    let cancelled = false
    setLoadingKpis(true)
    listKpiTargetOptions(sessionId, tenantId, campaignId)
      .then((res) => {
        if (cancelled) return
        setKpiOptions(res.kpis)
        setCampaignSpan({ start: res.campaign_start, end: res.campaign_end })
        // Don't auto-apply the previous report's targets — a target silently carried
        // from another period is the same class of mistake as grading against the
        // campaign figure. Offer it as one click instead.
        setWindowTargets({})
      })
      .catch(() => {
        if (!cancelled) {
          setKpiOptions([])
          setCampaignSpan({ start: null, end: null })
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingKpis(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId, tenantId, sessionId])

  // Whether this window spans the whole campaign — mirrors the backend's rule, and
  // only changes the wording of the hint (the backend decides the actual grading).
  const windowCoversCampaign = Boolean(
    campaignSpan.start &&
      campaignSpan.end &&
      startDate <= campaignSpan.start &&
      endDate >= campaignSpan.end,
  )

  const anySuggested = kpiOptions.some((k) => k.suggested !== null && k.suggested !== undefined)

  const applySuggested = () => {
    const next: Record<string, string> = { ...windowTargets }
    kpiOptions.forEach((k) => {
      if (k.suggested !== null && k.suggested !== undefined) next[k.key] = String(k.suggested)
    })
    setWindowTargets(next)
  }

  const handleTargetChange = (key: string, raw: string) => {
    setWindowTargets((prev) => {
      const next = { ...prev }
      if (raw.trim() === '') delete next[key]
      else next[key] = raw
      return next
    })
  }

  const handleGenerate = async () => {
    if (!campaignId) return
    if (!startDate || !endDate || endDate < startDate) return
    // Only send targets that parse to a real number — a half-typed "1." or a stray
    // letter must not reach the backend as a target the report then grades against.
    const parsedTargets: Record<string, number> = {}
    Object.entries(windowTargets).forEach(([key, raw]) => {
      const n = Number(raw)
      if (raw.trim() !== '' && Number.isFinite(n)) parsedTargets[key] = n
    })

    const params: GenerateReportParams = {
      campaign_id: campaignId,
      start_date: startDate,
      end_date: endDate,
      top_ad_metric: topAdMetric,
      top_organic_metric: topOrganicMetric,
      window_targets: Object.keys(parsedTargets).length > 0 ? parsedTargets : undefined,
    }
    const report = await generate(params)
    // Only advance to the report view if the POST succeeded; otherwise stay on the
    // configure step so the error banner is visible.
    if (report) setSearchParams({ report: report.report_id })
  }

  const handleOpenReport = async (reportId: string) => {
    setSearchParams({ report: reportId })
  }

  // Follow the address: a report id opens it; none (breadcrumb, browser back) is the list.
  useEffect(() => {
    if (reportParam) {
      if (activeReport?.report_id !== reportParam) void openReport(reportParam)
      setStep('report')
    } else if (step === 'report') {
      setActiveReport(null)
      setStep('list')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follows the address only
  }, [reportParam])

  // ?new=1&campaign=<id>: start a new report for that campaign.
  useEffect(() => {
    const cid = searchParams.get('campaign')
    if (searchParams.get('new') && cid) setCampaignId(cid)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, from the link
  }, [])

  const reportName = activeReport?.report_data?.cover
    ? `${activeReport.report_data.cover.campaign_name} · ${activeReport.report_data.cover.reporting_period_label}`
    : 'Report'
  const crumbs = (last?: string): Crumb[] =>
    last
      ? [{ label: 'Home', to: '/home' }, { label: 'Reports', to: '/reports' }, { label: last }]
      : [{ label: 'Home', to: '/home' }, { label: 'Reports' }]

  if (step === 'report' && activeReport) {
    const backToList = () => setSearchParams({})

    // Report still generating on the backend — show progress, poll runs in the hook.
    if (activeReport.status === 'generating' || (!activeReport.report_data && !error)) {
      return (
        <div className="flex flex-col h-full">
          <TopBar title="Reports" onBack={backToList} breadcrumbs={crumbs(reportName)} />
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center space-y-4 max-w-sm">
              <div className="mx-auto h-10 w-10 rounded-full border-2 border-brand-solid border-t-transparent animate-spin" />
              <p className="paragraph-md font-medium text-primary">Generating your report…</p>
              <p className="paragraph-sm text-tertiary">
                Pulling platform data and writing the sections. This usually takes
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
          <TopBar title="Reports" onBack={backToList} breadcrumbs={crumbs(reportName)} />
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center space-y-4 max-w-sm">
              <p className="paragraph-md font-medium text-primary">Report generation failed</p>
              <p className="paragraph-sm text-tertiary">
                {error || 'Something went wrong while generating this report. Please try again.'}
              </p>
              <button
                onClick={() => setStep('configure')}
                className="px-4 py-2 rounded-lg bg-brand-solid text-white paragraph-sm font-medium hover:opacity-90 transition-opacity"
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
      <div className="flex flex-col h-full">
        <TopBar title={reportName} onBack={backToList} breadcrumbs={crumbs(reportName)} />
        <div className="flex-1 min-h-0">
          <ReportOnePager report={activeReport} onBack={backToList} saveOverrides={saveOverrides} />
        </div>
      </div>
    )
  }

  if (step === 'configure') {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
      <TopBar title="New report" onBack={() => { setSearchParams({}); setStep('list') }} breadcrumbs={crumbs('New report')} />
      <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
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
              <div className={`rounded-lg${nudgeCampaign ? ' mia-nudge' : ''}`} onAnimationEnd={() => setNudgeCampaign(false)}>
              <SelectBox
                ref={campaignSelect}
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                aria-label="Campaign"
              >
                <option value="">Select a campaign…</option>
                {campaigns.map((c) => (
                  <option key={c.campaign_id} value={c.campaign_id}>
                    {c.client_name ? `${c.client_name} · ` : ''}{c.campaign_name}
                    {c.builder === 'v2' ? ' (Campaign builder)' : ' (old campaign)'}
                  </option>
                ))}
              </SelectBox>
              </div>
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
              <DateBox label="Start date" value={startDate} max={endDate || undefined} onChange={setStartDate} />
            </div>
            <div>
              <label className="paragraph-sm font-medium text-secondary block mb-1.5">
                End date
              </label>
              <DateBox label="End date" value={endDate} min={startDate || undefined} onChange={setEndDate} />
            </div>
          </div>
          {endDate && startDate && endDate < startDate && (
            <p className="paragraph-sm text-red-500 mt-1.5">
              End date must be on or after the start date.
            </p>
          )}

          {/* Studio hours: removed 19 Nov 2026 (ClickUp is going; back once Flex is in). */}

          {/* Metric pickers, side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="paragraph-sm font-medium text-secondary block mb-1.5">
              Top paid ad by
            </label>
            <SelectBox
              value={topAdMetric}
              onChange={(e) => setTopAdMetric(e.target.value as TopAdMetric)}
            >
              {TOP_AD_METRIC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectBox>
          </div>

          <div>
            <label className="paragraph-sm font-medium text-secondary block mb-1.5">
              Top organic post by
            </label>
            <SelectBox
              value={topOrganicMetric}
              onChange={(e) => setTopOrganicMetric(e.target.value as TopOrganicMetric)}
            >
              {TOP_ORGANIC_METRIC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectBox>
          </div>
          </div>

          {/* Window targets. Campaign targets cover the whole campaign, so grading a
              shorter window against them misreports it — a KPI at 204% of its campaign
              target once read "fell short" off one month's number. A target entered here
              is measured against this window; anything left blank is reported ungraded
              rather than compared to a figure it doesn't cover. */}
          {campaignId && (
            <div>
              <label className="paragraph-sm font-medium text-secondary block mb-1">
                KPI targets for this period{' '}
                <span className="text-tertiary font-normal">(optional)</span>
              </label>
              <p className="paragraph-xs text-tertiary mb-2.5">
                {windowCoversCampaign
                  ? 'This period covers the whole campaign, so campaign targets apply. Override any below if you want.'
                  : 'Campaign targets cover the full campaign. Set what this period alone should hit. Anything left blank is reported without a pass/fail.'}
              </p>

              {loadingKpis ? (
                <p className="paragraph-xs text-tertiary">Loading KPIs…</p>
              ) : kpiOptions.length === 0 ? (
                <p className="paragraph-xs text-tertiary">No KPIs on this campaign.</p>
              ) : (
                <div className="space-y-1.5">
                  {kpiOptions.map((k) => (
                    <div key={k.key} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="paragraph-sm text-primary truncate block">
                          {k.kpi_name}
                        </span>
                        <span className="paragraph-xs text-tertiary">
                          {k.phase}
                          {k.campaign_target ? ` · campaign target ${k.campaign_target}` : ''}
                        </span>
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={windowTargets[k.key] ?? ''}
                        onChange={(e) => handleTargetChange(k.key, e.target.value)}
                        placeholder={k.unit === 'percent' ? '%' : '—'}
                        aria-label={`${k.kpi_name} target for this period`}
                        className="w-28 shrink-0 px-2.5 py-1.5 rounded-lg border border-primary bg-primary text-primary paragraph-sm focus:outline-none focus:border-brand-solid"
                      />
                    </div>
                  ))}
                  {anySuggested && (
                    <button
                      type="button"
                      onClick={applySuggested}
                      className="paragraph-xs text-brand-secondary hover:opacity-80 pt-1"
                    >
                      Use targets from the last report
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Always clickable: with no campaign picked it points at the picker instead of doing
            nothing (19 Nov 2026: a dimmed button with an I-beam cursor said nothing). */}
        <button
          onClick={() => {
            if (!campaignId) {
              setNudgeCampaign(true)
              campaignSelect.current?.focus()
              return
            }
            void handleGenerate()
          }}
          disabled={generating}
          className={`w-full py-3 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium shadow-sm hover:bg-brand-solid-hover active:scale-[0.99] transition disabled:opacity-60 ${
            campaignId ? '' : 'opacity-70'
          }`}
        >
          {generating ? 'Generating report…' : campaignId ? 'Generate report' : 'Pick a campaign to start'}
        </button>

        {generating && (
          <p className="paragraph-xs text-tertiary text-center">
            Reading the platforms and writing it up. About a minute.
          </p>
        )}
      </div>
      </div>
    )
  }

  // List view
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Reports" onBack={onBack} breadcrumbs={crumbs()} />
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
      {/* The top bar already says "Reports": one line and the action (19 Nov 2026). */}
      <div className="flex items-center justify-between gap-3">
        <p className="paragraph-sm text-tertiary">Client reports, filled from the platforms.</p>
        <button
          onClick={() => setStep('configure')}
          className="shrink-0 px-3.5 py-2 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium shadow-sm hover:bg-brand-solid-hover active:scale-[0.98] transition"
        >
          New report
        </button>
      </div>

      {loadingReports ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : listError && reports.length === 0 ? (
        // A failed load must not look like "no reports" (Audit #13).
        <div className="text-center py-16 space-y-3">
          <p className="paragraph-md text-secondary">Couldn't load your reports</p>
          <p className="paragraph-sm text-tertiary">
            This is a temporary loading issue. Your reports are safe.
          </p>
          <button
            onClick={() => reloadReports()}
            className="mt-2 px-4 py-2 rounded-lg bg-brand-solid text-white paragraph-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      ) : reports.length === 0 ? (
        // Empty state: one line and the one thing to do, pulsing once (19 Nov 2026).
        <div className="mia-fade-in rounded-2xl border border-dashed border-secondary bg-secondary px-6 py-12 text-center space-y-3">
          <p className="text-[15px] font-semibold text-primary">No reports yet</p>
          <p className="paragraph-sm text-tertiary">A client report pulls a campaign's numbers and writes it up.</p>
          <button
            onClick={() => setStep('configure')}
            className="mia-nudge mt-2 px-4 py-2 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium shadow-sm hover:bg-brand-solid-hover active:scale-[0.98] transition"
          >
            Make your first report
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

const STATUS_LABEL: Record<string, string> = { complete: 'Ready', generating: 'Making…', pending: 'Making…', failed: 'Failed' }

const ReportListItem = ({
  report,
  onOpen,
  onDelete,
}: {
  report: ReportSummary
  onOpen: () => void
  onDelete: () => void
}) => (
  <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-secondary bg-secondary hover:border-brand-solid/40 hover:-translate-y-px hover:shadow-sm transition-all group">
    <button onClick={onOpen} className="flex-1 text-left space-y-0.5">
      {/* The campaign names the report; the workspace name was the same on every row (20 Nov 2026). */}
      <p className="paragraph-sm font-medium text-primary">
        {report.campaign_name || report.client_name || 'Unnamed report'}
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
            ? 'bg-success-primary text-success'
            : report.status === 'failed'
              ? 'bg-error-primary text-error'
              : 'bg-warning-primary text-warning'
        }`}
      >
        {STATUS_LABEL[report.status] ?? report.status.charAt(0).toUpperCase() + report.status.slice(1)}
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
