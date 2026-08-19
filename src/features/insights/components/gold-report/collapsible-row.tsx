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
  children: ReactNode
  /** Drives open state when "Expand all" is toggled at the report level. */
  forceOpen?: boolean
}

// One disclosure row: everything scannable on the closed line, the prose inside.
export const CollapsibleRow = ({
  lead,
  title,
  subtitle,
  stat,
  children,
  forceOpen,
}: CollapsibleRowProps) => {
  const [open, setOpen] = useState(false)
  // Follow the report-level toggle, while still allowing per-row clicks after.
  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen)
  }, [forceOpen])

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
            className="block text-[14px] leading-5 font-semibold"
            style={{ color: 'var(--gr-heading)' }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className="block text-[12px] leading-[17px] mt-0.5"
              style={{ color: 'var(--gr-muted)' }}
            >
              {subtitle}
            </span>
          )}
        </span>
        {stat && (
          <span
            className="text-[13px] whitespace-nowrap tabular-nums hidden sm:block"
            style={{ fontFamily: 'var(--gr-mono)', color: 'var(--gr-green)' }}
          >
            {stat}
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
