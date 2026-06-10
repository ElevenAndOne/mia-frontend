import { useNavigate } from 'react-router-dom'
import type { BudgetPlatformRow, BudgetSnapshot } from '../types'
import { barColorForSpend, clampPct, formatMoney } from '../budget-format'

interface Props {
  snapshot: BudgetSnapshot
}

const PacingBar = ({ pct }: { pct: number | null }) => (
  <div className="h-2 w-full rounded-full bg-tertiary overflow-hidden">
    <div
      className={`h-full rounded-full ${barColorForSpend(pct)}`}
      style={{ width: `${clampPct(pct)}%` }}
    />
  </div>
)

const StateNote = ({ row, onLink }: { row: BudgetPlatformRow; onLink: () => void }) => {
  if (row.needs_link) {
    return (
      <button onClick={onLink} className="paragraph-xs text-utility-brand-500 hover:underline">
        Link to track spend →
      </button>
    )
  }
  return <span className="paragraph-xs text-tertiary">no live spend</span>
}

export const BudgetPlatformBreakdown = ({ snapshot }: Props) => {
  const navigate = useNavigate()
  const { currency } = snapshot
  const rows = snapshot.platforms
  const goLink = () => navigate('/campaigns')

  return (
    <div className="rounded-2xl border border-tertiary bg-secondary/40 p-6">
      <p className="text-base font-semibold text-primary mb-4">Platform Breakdown</p>

      {/* Desktop table */}
      <table className="hidden md:table w-full text-left">
        <thead>
          <tr className="paragraph-xs uppercase tracking-wide text-tertiary">
            <th className="font-normal pb-3">Platform</th>
            <th className="font-normal pb-3 text-right">Allocation</th>
            <th className="font-normal pb-3 text-right">Spent</th>
            <th className="font-normal pb-3 text-right">Remaining</th>
            <th className="font-normal pb-3 pl-4 w-[28%]">Pacing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.platform} className="border-t border-tertiary/60">
              <td className="py-4 text-sm text-primary">
                {row.label}
                {row.flights > 1 && (
                  <span className="paragraph-xs text-tertiary"> · {row.flights} flights</span>
                )}
              </td>
              <td className="py-4 text-sm text-secondary text-right">
                {row.allocation > 0 ? formatMoney(row.allocation, currency) : '—'}
              </td>
              <td className="py-4 text-sm text-right">
                {row.spend_pending ? (
                  <span className="text-tertiary animate-pulse">…</span>
                ) : row.spend_available ? (
                  <span className="text-primary">{formatMoney(row.spent, currency)}</span>
                ) : (
                  <StateNote row={row} onLink={goLink} />
                )}
              </td>
              <td className="py-4 text-sm text-right">
                {row.spend_pending ? (
                  <span className="text-tertiary">—</span>
                ) : (
                  <span
                    className={
                      row.remaining != null && row.remaining < 0
                        ? 'text-utility-error-500'
                        : 'text-secondary'
                    }
                  >
                    {row.spend_available && row.allocation > 0 ? formatMoney(row.remaining, currency) : '—'}
                  </span>
                )}
              </td>
              <td className="py-4 pl-4">
                {row.spend_pending ? (
                  <span className="paragraph-xs text-tertiary">—</span>
                ) : row.spend_available && row.allocation > 0 ? (
                  <div className="flex items-center gap-2">
                    <PacingBar pct={row.spent_pct ?? null} />
                    <span className="paragraph-xs text-tertiary shrink-0 w-9 text-right">
                      {row.spent_pct != null ? `${Math.round(row.spent_pct)}%` : ''}
                    </span>
                  </div>
                ) : (
                  <span className="paragraph-xs text-tertiary">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile stacked cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <div key={row.platform} className="rounded-lg border border-tertiary/60 p-3">
            <div className="flex items-center justify-between">
              <span className="paragraph-sm text-primary">{row.label}</span>
              {row.spend_pending ? (
                <span className="paragraph-sm text-tertiary animate-pulse">…</span>
              ) : row.spend_available ? (
                <span className="paragraph-sm text-primary">
                  {formatMoney(row.spent, currency)}
                  {row.allocation > 0 && (
                    <span className="text-tertiary"> / {formatMoney(row.allocation, currency)}</span>
                  )}
                </span>
              ) : (
                <StateNote row={row} onLink={goLink} />
              )}
            </div>
            {row.spend_available && row.allocation > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <PacingBar pct={row.spent_pct ?? null} />
                <span className="paragraph-xs text-tertiary shrink-0 w-9 text-right">
                  {row.spent_pct != null ? `${Math.round(row.spent_pct)}%` : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
