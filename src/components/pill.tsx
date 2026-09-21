import type { ReactNode } from 'react'

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

interface PillProps {
  tone?: PillTone
  /** Leading status dot in the tone colour. */
  dot?: boolean
  /** Native tooltip. */
  title?: string
  className?: string
  children: ReactNode
}

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: 'bg-secondary border-secondary text-quaternary',
  info: 'bg-utility-info-100 border-utility-info-200 text-utility-info-700',
  success: 'bg-utility-success-100 border-utility-success-200 text-utility-success-700',
  warning: 'bg-utility-warning-100 border-utility-warning-200 text-utility-warning-700',
  error: 'bg-utility-error-100 border-utility-error-200 text-utility-error-700',
}

const DOT_CLASSES: Record<PillTone, string> = {
  neutral: 'bg-quaternary',
  info: 'bg-utility-info-600',
  success: 'bg-utility-success-500',
  warning: 'bg-utility-warning-500',
  error: 'bg-utility-error-500',
}

// Small rounded status label. Tone carries the meaning; the caller supplies the text.
export const Pill = ({ tone = 'neutral', dot = false, title, className = '', children }: PillProps) => (
  <span
    title={title}
    data-tone={tone}
    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 label-xs whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`.trim()}
  >
    {dot && <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASSES[tone]}`} />}
    {children}
  </span>
)
