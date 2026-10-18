// What Mia spends, from the backend's cost meter (P0, docs2/BASIC_FLOWS_FINAL_PLAN_2026-10-18.md):
// every paid call (Claude, OpenAI, fal, Gemini, Twilio) plus a hosting share, in rand and dollars.

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCosts } from './services/pulse-service'
import type { CostMoney, PulseRange } from './types'

const TIERS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'basic', label: 'Basic' },
  { key: 'team', label: 'Team' },
  { key: 'agency', label: 'Agency' },
]

function daysOf(range: PulseRange): number {
  return range === '7d' ? 7 : range === '30d' ? 30 : 366
}

function rand(m?: CostMoney): string {
  if (!m) return '—'
  const z = m.zar
  return `R${z >= 100 ? Math.round(z).toLocaleString() : z.toFixed(2)}`
}

function usd(m?: CostMoney): string {
  if (!m) return ''
  return m.usd >= 100 ? `$${Math.round(m.usd).toLocaleString()}` : `$${m.usd.toFixed(2)}`
}

function Money({ m }: { m?: CostMoney }) {
  return (
    <>
      {rand(m)} <small>{usd(m)}</small>
    </>
  )
}

export function CostsPanel({ sessionId, range }: { sessionId: string | null; range: PulseRange }) {
  const [tier, setTier] = useState('basic')
  const days = daysOf(range)
  const q = useQuery({
    queryKey: ['pulse', 'costs', days, tier, sessionId],
    queryFn: () => fetchCosts(sessionId, days, tier || null),
    enabled: !!sessionId,
    staleTime: 60 * 1000,
  })
  const d = q.data

  return (
    <div className="plz-card plz-costs">
      <div className="plz-card-h">
        <h2>What Mia costs</h2>
        <div className="plz-seg" role="tablist" aria-label="Tier">
          {TIERS.map((t) => (
            <button key={t.key} className={t.key === tier ? 'on' : ''} aria-pressed={t.key === tier} onClick={() => setTier(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {q.isLoading && <div className="plz-hint">Loading…</div>}
      {q.isError && <div className="plz-hint">Couldn't load costs.</div>}
      {d && (
        <>
          <div className="plz-kpis">
            <div className="plz-card plz-kpi" title="Every paid call in the window: models, pictures and WhatsApp messages">
              <div className="plz-lab">Usage</div>
              <div className="plz-val plz-num"><Money m={d.totals.usage} /></div>
            </div>
            <div className="plz-card plz-kpi" title="The servers Basic runs on, shared across every workspace active in the window, incl. VAT">
              <div className="plz-lab">Hosting share</div>
              <div className="plz-val plz-num"><Money m={d.totals.hosting_share} /></div>
            </div>
            <div className="plz-card plz-kpi" title="Usage + hosting share, minus Meta's 1,000 free service messages a month">
              <div className="plz-lab">All in</div>
              <div className="plz-val plz-num"><Money m={d.totals.all_in} /></div>
            </div>
            <div className="plz-card plz-kpi" title={`${d.per_workspace.workspaces} workspaces with paid calls in the window, scaled to 30 days`}>
              <div className="plz-lab">Per workspace a month</div>
              <div className="plz-val plz-num"><Money m={d.per_workspace.all_in_avg_month} /></div>
            </div>
          </div>
          <div className="plz-hint">
            R{d.rate.usd_zar.toFixed(2)} to the dollar (ECB, {d.rate.as_of}) · prices checked {d.prices_checked}
            {d.totals.unpriced_calls > 0 && ` · ${d.totals.unpriced_calls} calls have no price yet`}
            {d.totals.untagged.usd > 0 && ` · ${rand(d.totals.untagged)} not tied to a workspace`}
          </div>
          <div className="plz-cols">
            <table className="plz-table">
              <thead>
                <tr><th>By feature</th><th className="r">Calls</th><th className="r">Cost</th></tr>
              </thead>
              <tbody>
                {d.by_feature.map((f) => (
                  <tr key={f.feature}><td>{f.feature}</td><td className="r">{f.calls}</td><td className="r"><Money m={f} /></td></tr>
                ))}
              </tbody>
            </table>
            <table className="plz-table">
              <thead>
                <tr><th>By provider</th><th className="r">Calls</th><th className="r">Cost</th></tr>
              </thead>
              <tbody>
                {d.by_provider.map((p) => (
                  <tr key={p.provider}><td>{p.provider}</td><td className="r">{p.calls}</td><td className="r"><Money m={p} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <table className="plz-table">
            <thead>
              <tr><th>Workspace</th><th>Tier</th><th className="r">Calls</th><th className="r">Usage</th></tr>
            </thead>
            <tbody>
              {d.by_workspace.slice(0, 25).map((w) => (
                <tr key={w.tenant_id}><td>{w.name}</td><td>{w.tier ?? '—'}</td><td className="r">{w.calls}</td><td className="r"><Money m={w} /></td></tr>
              ))}
            </tbody>
          </table>
          {d.first_day.length > 0 && (
            <table className="plz-table">
              <thead>
                <tr><th>New sign-ups: first day</th><th>Signed up</th><th className="r">Calls</th><th className="r">Cost</th></tr>
              </thead>
              <tbody>
                {d.first_day.map((s) => (
                  <tr key={s.tenant_id}>
                    <td>{s.name ?? s.tenant_id}</td>
                    <td>{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                    <td className="r">{s.calls}</td>
                    <td className="r"><Money m={s} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
