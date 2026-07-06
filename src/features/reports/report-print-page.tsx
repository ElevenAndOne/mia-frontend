import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ReportOnePager } from './report-onepager'
import { getReportForPrint } from './services/report-service'
import type { ClientReport } from './types'

/**
 * Standalone print route (/report-print?token=&tid=&rid=) used by the backend Playwright
 * PDF renderer. Not behind ProtectedRoute — it authenticates via a signed, short-lived,
 * report-scoped print `token` (Audit #4 Phase 5), NOT a session id. Sets
 * data-print-ready="true" once the report has loaded so Playwright knows when to capture.
 */
export const ReportPrintPage = () => {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const tid = params.get('tid') || ''
  const rid = params.get('rid') || ''
  const [report, setReport] = useState<ClientReport | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    if (!token || !tid || !rid) {
      setError(true)
      return
    }
    getReportForPrint(token, tid, rid)
      .then((r) => {
        if (!active) return
        if (r) setReport(r)
        else setError(true)
      })
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [token, tid, rid])

  const ready = !!report || error
  return (
    <div data-print-ready={ready ? 'true' : 'false'} style={{ background: '#fff' }}>
      {report ? (
        <ReportOnePager report={report} onBack={() => {}} printMode />
      ) : error ? (
        <div style={{ padding: 24 }}>Report unavailable.</div>
      ) : null}
    </div>
  )
}

export default ReportPrintPage
