import type { GoldCampaignEvidence } from './types'

const money = (currency: string, n: number) =>
  `${currency === 'ZAR' ? 'R' : `${currency} `}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const Cell = ({ children }: { children: React.ReactNode }) => (
  <td
    className="py-2.5 px-3 text-right whitespace-nowrap tabular-nums text-[12.5px]"
    style={{ fontFamily: 'var(--gr-mono)', color: 'var(--gr-body)' }}
  >
    {children}
  </td>
)

// The paid counterpart of "the posts behind the numbers": the actual campaigns
// the report is describing, with metrics computed from the ad platforms rather
// than restated from the report. The blended portfolio line is aggregate-first
// (spend ÷ clicks), so it is directly comparable to any average the report cites.
export const CampaignEvidence = ({ evidence }: { evidence: GoldCampaignEvidence }) => {
  const { portfolio, campaigns, shown_of } = evidence
  const cur = portfolio.currency
  return (
    <div className="gr-card overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b" style={{ borderColor: 'var(--gr-line)' }}>
        <p className="gr-eyebrow mb-1.5">Portfolio actuals · last {evidence.window.days} days</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {[
            ['Spend', money(cur, portfolio.spend)],
            ['Clicks', portfolio.clicks.toLocaleString()],
            ['Blended CPC', portfolio.blended_cpc != null ? money(cur, portfolio.blended_cpc) : '—'],
            ['Blended CPM', portfolio.blended_cpm != null ? money(cur, portfolio.blended_cpm) : '—'],
            ['CTR', portfolio.blended_ctr_pct != null ? `${portfolio.blended_ctr_pct}%` : '—'],
          ].map(([label, value]) => (
            <span key={label} className="text-[12.5px]">
              <span style={{ color: 'var(--gr-muted)' }}>{label} </span>
              <span
                className="font-bold tabular-nums"
                style={{ fontFamily: 'var(--gr-mono)', color: 'var(--gr-green)' }}
              >
                {value}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Campaign', 'Spend', 'Clicks', 'CTR', 'CPC'].map((h, i) => (
                <th
                  key={h}
                  className={`py-2 px-3 text-[10px] font-bold tracking-[0.06em] uppercase whitespace-nowrap ${
                    i === 0 ? 'text-left' : 'text-right'
                  }`}
                  style={{ color: 'var(--gr-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr key={i} className="border-t" style={{ borderColor: 'var(--gr-line)' }}>
                <td className="py-2.5 px-3 text-[13px]" style={{ color: 'var(--gr-heading)' }}>
                  <span className="gr-inner gr-chip uppercase mr-2">{c.platform}</span>
                  {c.name}
                </td>
                <Cell>{money(cur, c.spend)}</Cell>
                <Cell>{c.clicks.toLocaleString()}</Cell>
                <Cell>{c.ctr_pct != null ? `${c.ctr_pct}%` : '—'}</Cell>
                <Cell>{c.cpc != null ? money(cur, c.cpc) : '—'}</Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        className="px-4 sm:px-5 py-2.5 text-[11.5px] leading-[17px] border-t"
        style={{ borderColor: 'var(--gr-line)', color: 'var(--gr-muted)' }}
      >
        Top {campaigns.length} of {shown_of} active campaigns by spend. {portfolio.basis}
      </p>
    </div>
  )
}
