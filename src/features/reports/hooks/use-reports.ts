import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import type { ClientReport, GenerateReportParams, ReportSummary } from '../types'
import {
  deleteReport,
  generateReport,
  getClickUpSpaces,
  getReport,
  linkClickUpList,
  listReports,
  patchReport,
} from '../services/report-service'
import type { ClickUpSpace } from '../types'

// Reports now generate asynchronously on the backend (status 'generating' → 'complete'/'failed');
// the client polls the report until it reaches a terminal state.
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 5 * 60 * 1000

// Build the list-row summary from a full report (used when the row's cover only becomes
// available once generation finishes).
const summaryFromReport = (r: ClientReport): ReportSummary => ({
  report_id: r.report_id,
  campaign_id: r.campaign_id,
  period_start: r.period_start,
  period_end: r.period_end,
  report_month: r.report_month,
  report_year: r.report_year,
  status: r.status,
  client_name: r.report_data?.cover.client_name ?? '',
  campaign_name: r.report_data?.cover.campaign_name ?? '',
  reporting_period_label: r.report_data?.cover.reporting_period_label ?? '',
  created_at: r.created_at,
})

export const useReports = () => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? ''
  const { showToast } = useToast()

  const queryClient = useQueryClient()
  const listEnabled = !!sessionId && !!tenantId

  // The report list lives in the React Query cache — revisits render instantly
  // and a background refetch keeps it fresh.
  const {
    data: reportsData,
    isPending: listPending,
    isError: listError,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['reports', tenantId],
    queryFn: () => listReports(sessionId!, tenantId),
    enabled: listEnabled,
  })
  const reports = reportsData ?? []
  const loadingReports = listEnabled && listPending

  // Polling / generation patch the cached list rows in place.
  const setReports = useCallback(
    (updater: (prev: ReportSummary[]) => ReportSummary[]) => {
      queryClient.setQueryData<ReportSummary[]>(['reports', tenantId], (prev) =>
        updater(prev ?? [])
      )
    },
    [queryClient, tenantId]
  )

  const [activeReport, setActiveReport] = useState<ClientReport | null>(null)
  const [generating, setGenerating] = useState(false)
  // `error` is generation-specific; `listError` (above, from the query) is set when
  // the report LIST itself fails to load, so the view shows "couldn't load — retry"
  // instead of the misleading "No reports yet" empty state (Audit #13).
  const [error, setError] = useState<string | null>(null)

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartedAt = useRef<number>(0)

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
  }, [])

  // Poll a generating report until it completes or fails. Keeps `generating` true throughout so
  // the UI can show a progress state, and refreshes both the active report and its list row.
  const pollReport = useCallback(
    (reportId: string) => {
      if (!sessionId || !tenantId) return
      stopPolling()
      pollStartedAt.current = Date.now()
      pollTimer.current = setInterval(async () => {
        if (Date.now() - pollStartedAt.current > POLL_TIMEOUT_MS) {
          stopPolling()
          setGenerating(false)
          setError('Report is taking longer than expected — check back in a moment.')
          return
        }
        let latest: ClientReport | null
        try {
          latest = await getReport(sessionId, tenantId, reportId)
        } catch {
          // Transient failure mid-poll — skip this tick and retry on the next
          // interval rather than aborting generation or spamming the user.
          return
        }
        if (!latest) return

        setReports((prev) =>
          prev.map((r) => (r.report_id === reportId ? summaryFromReport(latest) : r)),
        )
        setActiveReport((cur) => (cur?.report_id === reportId ? latest : cur))

        if (latest.status === 'complete') {
          stopPolling()
          setGenerating(false)
        } else if (latest.status === 'failed') {
          stopPolling()
          setGenerating(false)
          setError('Report generation failed. Please try again.')
        }
      }, POLL_INTERVAL_MS)
    },
    [sessionId, tenantId, stopPolling, setReports],
  )

  // Stop any in-flight polling when the component unmounts.
  useEffect(() => stopPolling, [stopPolling])

  // ClickUp spaces (for campaign linking)
  const [clickupSpaces, setClickupSpaces] = useState<ClickUpSpace[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(false)

  const loadReports = useCallback(async () => {
    await refetchReports()
  }, [refetchReports])

  const generate = useCallback(
    async (params: GenerateReportParams): Promise<ClientReport | null> => {
      if (!tenantId || !sessionId) return null
      setGenerating(true)
      setError(null)
      try {
        // POST returns immediately with status 'generating'; the row fills in the background.
        const report = await generateReport(sessionId, tenantId, params)
        setActiveReport(report)
        setReports((prev) => [summaryFromReport(report), ...prev])
        if (report.status === 'generating') {
          pollReport(report.report_id)
        } else {
          // Backend returned a terminal state synchronously (e.g. old behaviour) — nothing to poll.
          setGenerating(false)
        }
        return report
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate report')
        setGenerating(false)
        return null
      }
    },
    [sessionId, tenantId, pollReport, setReports],
  )

  const openReport = useCallback(
    async (reportId: string) => {
      if (!tenantId || !sessionId) return
      let report: ClientReport | null
      try {
        report = await getReport(sessionId, tenantId, reportId)
      } catch {
        showToast('error', "Couldn't open that report. Please try again.")
        return
      }
      setActiveReport(report)
      // Resume polling if we opened a report that's still generating (e.g. after navigating away).
      if (report?.status === 'generating') {
        setError(null)
        setGenerating(true)
        pollReport(report.report_id)
      }
    },
    [sessionId, tenantId, pollReport, showToast],
  )

  const saveOverrides = useCallback(
    async (reportId: string, overrides: Record<string, unknown>) => {
      if (!tenantId || !sessionId) return
      const updated = await patchReport(sessionId, tenantId, reportId, overrides)
      setActiveReport(updated)
    },
    [sessionId, tenantId],
  )

  const removeReport = useCallback(
    async (reportId: string) => {
      if (!tenantId || !sessionId) return
      stopPolling()
      setGenerating(false)
      await deleteReport(sessionId, tenantId, reportId)
      setReports((prev) => prev.filter((r) => r.report_id !== reportId))
      if (activeReport?.report_id === reportId) setActiveReport(null)
    },
    [sessionId, tenantId, activeReport, stopPolling, setReports],
  )

  const loadClickUpSpaces = useCallback(async () => {
    if (!tenantId || !sessionId || loadingSpaces) return
    setLoadingSpaces(true)
    try {
      const spaces = await getClickUpSpaces(sessionId, tenantId)
      setClickupSpaces(spaces)
    } catch {
      showToast('error', "Couldn't load ClickUp spaces. Please try again.")
    } finally {
      setLoadingSpaces(false)
    }
  }, [sessionId, tenantId, loadingSpaces, showToast])

  const linkList = useCallback(
    async (campaignId: string, clickupListId: string) => {
      if (!tenantId || !sessionId) return
      await linkClickUpList(sessionId, tenantId, campaignId, clickupListId)
    },
    [sessionId, tenantId],
  )

  return {
    reports,
    activeReport,
    setActiveReport,
    generating,
    loadingReports,
    error,
    listError,
    reloadReports: loadReports,
    generate,
    openReport,
    saveOverrides,
    removeReport,
    clickupSpaces,
    loadingSpaces,
    loadClickUpSpaces,
    linkList,
  }
}
