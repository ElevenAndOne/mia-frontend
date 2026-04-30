import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
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

export const useReports = () => {
  const { state } = useSession()
  const sessionId = state.sessionId ?? ''
  const tenantId = state.activeWorkspace?.tenant_id ?? ''

  const [reports, setReports] = useState<ReportSummary[]>([])
  const [activeReport, setActiveReport] = useState<ClientReport | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loadingReports, setLoadingReports] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ClickUp spaces (for campaign linking)
  const [clickupSpaces, setClickupSpaces] = useState<ClickUpSpace[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(false)

  const loadReports = useCallback(async () => {
    if (!tenantId) return
    setLoadingReports(true)
    try {
      const data = await listReports(sessionId, tenantId)
      setReports(data)
    } finally {
      setLoadingReports(false)
    }
  }, [sessionId, tenantId])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const generate = useCallback(
    async (params: GenerateReportParams) => {
      if (!tenantId) return
      setGenerating(true)
      setError(null)
      try {
        const report = await generateReport(sessionId, tenantId, params)
        setActiveReport(report)
        setReports((prev) => [
          {
            report_id: report.report_id,
            campaign_id: report.campaign_id,
            report_month: report.report_month,
            report_year: report.report_year,
            status: report.status,
            client_name: report.report_data?.cover.client_name ?? '',
            campaign_name: report.report_data?.cover.campaign_name ?? '',
            reporting_period_label: report.report_data?.cover.reporting_period_label ?? '',
            created_at: report.created_at,
          },
          ...prev,
        ])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate report')
      } finally {
        setGenerating(false)
      }
    },
    [sessionId, tenantId],
  )

  const openReport = useCallback(
    async (reportId: string) => {
      if (!tenantId) return
      const report = await getReport(sessionId, tenantId, reportId)
      setActiveReport(report)
    },
    [sessionId, tenantId],
  )

  const saveOverrides = useCallback(
    async (reportId: string, overrides: Record<string, unknown>) => {
      if (!tenantId) return
      const updated = await patchReport(sessionId, tenantId, reportId, overrides)
      setActiveReport(updated)
    },
    [sessionId, tenantId],
  )

  const removeReport = useCallback(
    async (reportId: string) => {
      if (!tenantId) return
      await deleteReport(sessionId, tenantId, reportId)
      setReports((prev) => prev.filter((r) => r.report_id !== reportId))
      if (activeReport?.report_id === reportId) setActiveReport(null)
    },
    [sessionId, tenantId, activeReport],
  )

  const loadClickUpSpaces = useCallback(async () => {
    if (!tenantId || loadingSpaces) return
    setLoadingSpaces(true)
    try {
      const spaces = await getClickUpSpaces(sessionId, tenantId)
      setClickupSpaces(spaces)
    } finally {
      setLoadingSpaces(false)
    }
  }, [sessionId, tenantId, loadingSpaces])

  const linkList = useCallback(
    async (campaignId: string, clickupListId: string) => {
      if (!tenantId) return
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
