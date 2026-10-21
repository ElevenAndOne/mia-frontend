import { type ReactNode, useEffect, useState } from 'react'

const Chevron = () => (
  <svg
    className="gr-chev w-4 h-4 shrink-0"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    style={{ color: 'var(--gr-muted)' }}
  >
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

interface CollapsibleRowProps {
  /** Left slot: rank number, tag pill or index. */
  lead?: ReactNode
  title: string
  /** One-line context under the title (deliverable objectives). */
  subtitle?: string
  /** Right-aligned figure — the number that makes the row worth opening. */
  stat?: string | null
  /** What the figure is measured against ("vs 39.11 Google Ads avg"), shown with it. */
  statDetail?: string | null
  children: ReactNode
  /** Drives open state when "Expand all" is toggled at the report level. */
  forceOpen?: boolean
  /** Opens the row each time it changes (a link elsewhere on the page points here). */
  openSignal?: number
}

// One disclosure row: everything scannable on the closed line, the prose inside.
export const CollapsibleRow = ({
  lead,
  title,
  subtitle,
  stat,
  statDetail,
  children,
  forceOpen,
  openSignal,
}: CollapsibleRowProps) => {
  const [open, setOpen] = useState(false)
  // Follow the report-level toggle, while still allowing per-row clicks after.
  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen)
  }, [forceOpen])
  useEffect(() => {
    if (openSignal) setOpen(true)
  }, [openSignal])

  return (
    <div className="border-t first:border-t-0" style={{ borderColor: 'var(--gr-line)' }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 text-left px-4 sm:px-5 py-3.5 hover:bg-[color:var(--gr-surface-2)] transition-colors"
      >
        {lead}
        <span className="flex-1 min-w-0">
          <span
            className="block text-[0.875rem] leading-5 font-semibold"
            style={{ color: 'var(--gr-heading)' }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className="block text-[0.75rem] leading-[1.0625rem] mt-0.5"
              style={{ color: 'var(--gr-muted)' }}
            >
              {subtitle}
            </span>
          )}
          {/* Narrow screens have no room on the right: the figure goes under the title. */}
          {stat && (
            <span
              className="sm:hidden block text-[0.75rem] leading-[1.0625rem] mt-0.5 tabular-nums"
              style={{ fontFamily: 'var(--gr-mono)' }}
            >
              <span style={{ color: 'var(--gr-green)' }}>{stat}</span>
              {statDetail && <span style={{ color: 'var(--gr-muted)' }}> {statDetail}</span>}
            </span>
          )}
        </span>
        {stat && (
          <span
            className="hidden sm:block shrink-0 max-w-[15rem] text-right tabular-nums"
            style={{ fontFamily: 'var(--gr-mono)' }}
          >
            <span
              className="block text-[0.8125rem] whitespace-nowrap"
              style={{ color: 'var(--gr-green)' }}
            >
              {stat}
            </span>
            {statDetail && (
              <span
                className="block text-[0.6875rem] leading-4"
                style={{ color: 'var(--gr-muted)' }}
              >
                {statDetail}
              </span>
            )}
          </span>
        )}
        <span className={open ? 'rotate-180 transition-transform' : 'transition-transform'}>
          <Chevron />
        </span>
      </button>
      {open && <div className="px-4 sm:px-5 pb-4 pl-4 sm:pl-12">{children}</div>}
    </div>
  )
}
