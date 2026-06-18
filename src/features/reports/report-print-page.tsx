import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ReportOnePager } from './report-onepager'
import { getReport } from './services/report-service'
import type { ClientReport } from './types'

/**
 * Standalone print route (/report-print?sid=&tid=&rid=) used by the backend Playwright
 * PDF renderer. Not behind ProtectedRoute — it authenticates via the `sid` query param
 * passed by the server. Sets data-print-ready="true" once the report has loaded so
 * Playwright knows when to capture.
 */
export const ReportPrintPage = () => {
  const [params] = useSearchParams()
  const sid = params.get('sid') || ''
  const tid = params.get('tid') || ''
  const rid = params.get('rid') || ''
  const [report, setReport] = useState<ClientReport | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    if (!sid || !tid || !rid) {
      setError(true)
      return
    }
    getReport(sid, tid, rid)
      .then((r) => {
        if (!active) return
        if (r) setReport(r)
        else setError(true)
      })
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [sid, tid, rid])

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
