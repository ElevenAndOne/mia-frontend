import type { PlatformRowView } from '../types'

interface Props {
  rows: PlatformRowView[]
}

const HEADERS = ['Platform', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPA', 'ROAS'] as const

const PlatformName = ({ row }: { row: PlatformRowView }) => (
  <span className="inline-flex items-center gap-2">
    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
    {row.label}
  </span>
)

// Per-platform figures for the window. When ROAS is not revenue-backed the row
// shows "—" for ROAS and CPA becomes the headline efficiency figure (emphasised).
export const PlatformBreakdownTable = ({ rows }: Props) => {
  if (rows.length === 0) return null

  return (
    <div className="rounded-2xl border border-secondary bg-secondary p-4 md:p-5">
      <span className="label-xs text-quaternary uppercase tracking-[0.14em]">By platform</span>

      {/* Desktop table */}
      <table className="hidden md:table w-full text-left mt-3">
        <thead>
          <tr className="paragraph-xs uppercase tracking-wide text-tertiary">
            {HEADERS.map((header, i) => (
              <th key={header} className={`font-normal pb-2 ${i === 0 ? '' : 'text-right'}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.platform} className="border-t border-tertiary/60">
              <td className="py-3 text-sm text-primary">
                <PlatformName row={row} />
              </td>
              <td className="py-3 text-sm text-primary text-right">{row.spend}</td>
              <td className="py-3 text-sm text-secondary text-right">{row.impressions}</td>
              <td className="py-3 text-sm text-secondary text-right">{row.clicks}</td>
              <td className="py-3 text-sm text-secondary text-right">{row.ctr}</td>
              <td
                className={`py-3 text-sm text-right ${row.roasBacked ? 'text-secondary' : 'text-primary font-semibold'}`}
              >
                {row.cpa}
              </td>
              <td
                className={`py-3 text-sm text-right ${row.roasBacked ? 'text-primary font-semibold' : 'text-quaternary'}`}
              >
                {row.roas}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile stacked cards */}
      <div className="md:hidden space-y-2 mt-3">
        {rows.map((row) => (
          <div key={row.platform} className="rounded-lg border border-tertiary/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="paragraph-sm text-primary">
                <PlatformName row={row} />
              </span>
              <span className="paragraph-sm text-primary">{row.spend}</span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 paragraph-xs">
              <dt className="text-tertiary">Impressions</dt>
              <dd className="text-secondary text-right">{row.impressions}</dd>
              <dt className="text-tertiary">Clicks</dt>
              <dd className="text-secondary text-right">{row.clicks}</dd>
              <dt className="text-tertiary">CTR</dt>
              <dd className="text-secondary text-right">{row.ctr}</dd>
              <dt className="text-tertiary">CPA</dt>
              <dd
                className={`text-right ${row.roasBacked ? 'text-secondary' : 'text-primary font-semibold'}`}
              >
                {row.cpa}
              </dd>
              <dt className="text-tertiary">ROAS</dt>
              <dd
                className={`text-right ${row.roasBacked ? 'text-primary font-semibold' : 'text-quaternary'}`}
              >
                {row.roas}
              </dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
