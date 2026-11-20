import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from '../../../components/icon/chevron-down'

/**
 * The parts every agency Settings tab is built from (UI polish, 19 Nov 2026): one look, few words.
 *
 *   Section     a heading that stands out a little, an optional one-line hint and action
 *   Card        a bordered panel; its rows are split by thin lines
 *   Row         title (+ short hint) on the left, the control on the right
 *   Disclosure  a closed row that slides open; its inside sits on a different shade so the
 *               heading and the content never blur together
 *   Switch      an on/off toggle
 *   FadeIn      content easing in when a tab first shows
 */

export const Section = ({
  title,
  hint,
  action,
  children,
}: {
  title: string
  hint?: ReactNode
  action?: ReactNode
  children: ReactNode
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div className="min-w-0">
        <h2 className="text-[15px] leading-6 font-semibold tracking-[-0.01em] text-primary">{title}</h2>
        {hint ? <p className="paragraph-xs text-tertiary mt-0.5">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0 flex items-center gap-2">{action}</div> : null}
    </div>
    {children}
  </section>
)

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div
    className={`settings-rows rounded-xl border border-secondary bg-secondary overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
  >
    {children}
  </div>
)

/** A label on top, its value under it (Name / DFSA), the controls on the right. Anything visual
 *  (a logo preview) goes in ``aside``, right of the text, so every label lines up on the left. */
export const Row = ({
  title,
  hint,
  aside,
  children,
}: {
  title: ReactNode
  hint?: ReactNode
  aside?: ReactNode
  children?: ReactNode
}) => (
  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
    <div className="min-w-0 flex-1">
      <div className="subheading-bg text-primary truncate">{title}</div>
      {hint ? <div className="paragraph-sm text-tertiary mt-0.5 [overflow-wrap:anywhere]">{hint}</div> : null}
    </div>
    {aside ? <div className="shrink-0">{aside}</div> : null}
    {children ? <div className="shrink-0 flex items-center gap-2">{children}</div> : null}
  </div>
)

/** Scroll an element into view only as far as needed (its top stays visible if it is tall). */
const scrollIntoViewSmooth = (el: HTMLElement | null) => {
  if (!el) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
}

/** Open/closed sections survive a refresh (this browser tab only; Josh, 19 Nov 2026). */
const openKey = (id: string) => `mia:open:${id}`
const readOpen = (id: string | undefined, fallback: boolean): boolean => {
  if (!id) return fallback
  try {
    const v = sessionStorage.getItem(openKey(id))
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

export const Disclosure = ({
  title,
  meta,
  defaultOpen = false,
  id,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  defaultOpen?: boolean
  /** Remembers open/closed under this key across a refresh. */
  id?: string
  children: ReactNode
}) => {
  const [open, setOpenState] = useState(() => readOpen(id, defaultOpen))
  const setOpen = (fn: (v: boolean) => boolean) =>
    setOpenState((v) => {
      const next = fn(v)
      if (id) {
        try {
          sessionStorage.setItem(openKey(id), next ? '1' : '0')
        } catch {
          /* private mode: just not remembered */
        }
      }
      return next
    })
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const justOpened = useRef(false)
  return (
    <div ref={box} className="scroll-mt-4">
      <button
        type="button"
        onClick={() =>
          setOpen((v) => {
            justOpened.current = !v
            return !v
          })
        }
        aria-expanded={open}
        className="group w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-tertiary/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block subheading-bg text-primary">{title}</span>
          {meta ? <span className="block paragraph-xs text-quaternary truncate mt-0.5">{meta}</span> : null}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-quaternary transition-transform duration-200 group-hover:text-secondary ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            // Once open, bring it into view smoothly (Josh, 19 Nov 2026): it opened below the fold.
            onAnimationComplete={() => {
              if (justOpened.current) {
                justOpened.current = false
                scrollIntoViewSmooth(box.current)
              }
            }}
            className="overflow-hidden"
          >
            <div className="border-t border-tertiary bg-primary px-4 py-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export const Switch = ({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative shrink-0 w-10 h-6 rounded-full transition-colors duration-200 disabled:opacity-50 ${
      checked ? 'bg-brand-solid' : 'bg-quaternary'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? 'translate-x-4' : ''
      }`}
    />
  </button>
)

/** A pill-style choice of two to four options; the chosen one filled, the rest quiet. */
export const Choice = <T extends string>({
  options,
  value,
  onChange,
  disabled,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
  label: string
}) => (
  <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-tertiary/60 p-0.5 gap-0.5">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={value === o.value}
        disabled={disabled}
        onClick={() => onChange(o.value)}
        className={`px-3 py-1.5 rounded-md paragraph-sm transition-all duration-150 disabled:opacity-50 ${
          value === o.value ? 'bg-quaternary text-primary shadow-sm font-medium' : 'text-tertiary hover:text-primary'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
)

export const FadeIn = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** A small quiet button for row actions ("Rename", "Edit"). */
export const RowButton = ({
  children,
  onClick,
  disabled,
  tone = 'default',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1.5 rounded-lg paragraph-sm border transition-colors disabled:opacity-50 ${
      tone === 'danger'
        ? 'border-error-subtle text-error hover:bg-error-primary'
        : 'border-secondary text-secondary hover:bg-tertiary hover:text-primary'
    }`}
  >
    {children}
  </button>
)
