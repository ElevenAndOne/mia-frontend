import { useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from './icon/chevron-down'

interface CollapsibleSectionProps {
  title: string
  /** One line shown next to the title while collapsed (e.g. a count or the current value). */
  summary?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
  /** Footnote style: no card, small secondary title — for 'what this changes' type asides. */
  compact?: boolean
}

/**
 * A settings card that starts folded: title + one-line summary, chevron to open. Keeps
 * long or rarely-touched sections (feature switches, style details) out of the way without
 * hiding them. Basic settings pages are built from these.
 */
export const CollapsibleSection = ({
  title,
  summary,
  defaultOpen = false,
  children,
  className = '',
  compact = false,
}: CollapsibleSectionProps) => {
  const [open, setOpenState] = useState(defaultOpen)
  const box = useRef<HTMLDivElement>(null)
  // Opening brings the section into view smoothly, only as far as needed (19 Nov 2026).
  const setOpen = (fn: (v: boolean) => boolean) =>
    setOpenState((v) => {
      const next = fn(v)
      if (next)
        requestAnimationFrame(() =>
          box.current?.scrollIntoView({
            behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'nearest',
          })
        )
      return next
    })
  if (compact) {
    return (
      <div ref={box} className={className}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 px-1 py-1 paragraph-xs text-quaternary hover:text-secondary transition-colors"
        >
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          <span>{title}</span>
          {!open && summary && <span className="text-quaternary/70">· {summary}</span>}
        </button>
        {open && <div className="px-1 pb-2">{children}</div>}
      </div>
    )
  }
  return (
    <div ref={box} className={`settings-card bg-secondary rounded-lg border border-tertiary ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-tertiary/60 rounded-lg transition-colors"
      >
        <div className="min-w-0">
          <p className="subheading-md text-primary">{title}</p>
          {!open && summary && <p className="paragraph-sm text-quaternary truncate">{summary}</p>}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-quaternary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}
