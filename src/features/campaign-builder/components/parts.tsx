import type { ReactNode } from 'react'
import { AlertTriangle } from '../../../components/icon/alert-triangle'
import type { BuildRun } from '../types'

// Small shared pieces of the campaign page. "Needs you" items always use the same amber
// pattern (plan §8.2): ⚠ + words + amber border, from the utility-warning tokens that have
// dark-mode pairs, so colour is never the only signal.

export const money = (v: number | null | undefined, currency = 'ZAR') =>
  v == null ? '—' : `${currency === 'ZAR' ? 'R' : `${currency} `}${Math.round(v).toLocaleString('en-US')}`

export const day = (d: string | null | undefined) => {
  if (!d) return '—'
  const x = new Date(`${d.slice(0, 10)}T00:00:00`)
  return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const num = (v: number | null | undefined) =>
  v == null ? '—' : Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { maximumFractionDigits: 2 })

export const CHANNEL_LABELS: Record<string, string> = {
  meta_ads: 'Meta ads',
  google_ads: 'Google ads',
  linkedin_ads: 'LinkedIn ads',
  tiktok_ads: 'TikTok ads',
  youtube_ads: 'YouTube ads',
  programmatic: 'Programmatic',
  organic_social: 'Organic social',
  email: 'Email',
  website: 'Website',
}
export const channelLabel = (c: string) => {
  const t = CHANNEL_LABELS[c] ?? c.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function NeedsYou({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-utility-warning-300 bg-utility-warning-100 px-2 py-0.5 label-xs text-utility-warning-700">
      <AlertTriangle size={12} />
      {children}
    </span>
  )
}

export function NeedsYouBanner({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div role="status" className="rounded-lg border-2 border-utility-warning-300 bg-utility-warning-100 px-4 py-3 text-utility-warning-700">
      <p className="subheading-sm flex items-center gap-2">
        <AlertTriangle size={16} />
        {title}
      </p>
      <ul className="mt-1 list-disc pl-6 paragraph-sm">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'pm' | 'mia' | 'good' }) {
  const cls = {
    neutral: 'bg-tertiary text-secondary',
    pm: 'bg-brand-solid text-primary-onbrand',
    mia: 'bg-secondary text-secondary border border-secondary',
    good: 'bg-success-primary text-success',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 label-xs ${cls}`}>{children}</span>
}

export function Card({ children, className = '', warn = false }: { children: ReactNode; className?: string; warn?: boolean }) {
  return (
    <section
      className={`rounded-xl bg-primary p-4 ${warn ? 'border-2 border-utility-warning-300' : 'border border-secondary'} ${className}`}
    >
      {children}
    </section>
  )
}

export function RunProgress({ run, what }: { run: BuildRun; what: string }) {
  return (
    <Card className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent text-secondary"
      />
      <div className="min-w-0">
        <p className="subheading-sm text-primary">Mia is making the {what}</p>
        <p className="paragraph-sm text-tertiary">
          {run.stage_label ?? 'Starting'}… {what === 'plan' ? 'This takes 5 to 15 minutes. You can leave the page; it keeps going.' : 'About a minute or two.'}
        </p>
      </div>
    </Card>
  )
}

export function RunFailed({ run, what, onRetry, busy }: { run: BuildRun; what: string; onRetry: () => void; busy: boolean }) {
  return (
    <Card warn className="flex flex-wrap items-center justify-between gap-3">
      <p className="paragraph-sm text-primary">
        {run.stale ? `Making the ${what} was interrupted (the server restarted).` : `Mia couldn't make the ${what}.`}
        {run.error && !run.stale ? <span className="block text-tertiary paragraph-xs mt-1">{run.error}</span> : null}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="rounded-lg border border-secondary bg-secondary px-3 py-1.5 paragraph-sm text-primary hover:bg-tertiary disabled:opacity-50"
      >
        Try again
      </button>
    </Card>
  )
}
