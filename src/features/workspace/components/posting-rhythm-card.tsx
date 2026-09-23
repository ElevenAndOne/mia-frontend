import { useCallback, useEffect, useState } from 'react'
import {
  fetchCadence,
  updateCadence,
  type PostingCadence,
  type Weekday,
} from '../services/posting-rhythm-service'

const DAYS: { key: Weekday; short: string }[] = [
  { key: 'monday', short: 'Mon' },
  { key: 'tuesday', short: 'Tue' },
  { key: 'wednesday', short: 'Wed' },
  { key: 'thursday', short: 'Thu' },
  { key: 'friday', short: 'Fri' },
  { key: 'saturday', short: 'Sat' },
  { key: 'sunday', short: 'Sun' },
]

/**
 * How often this workspace posts, and whether Mia may remind them.
 *
 * Everything shown is counted from their own posts unless they change it, and the card says
 * which ("from your posts"). The reminder is one WhatsApp message a week at most, on their
 * best day, only when nothing is lined up — the rule lives in the backend; this only turns it
 * on or off.
 */
export const PostingRhythmCard = ({
  sessionId,
  tenantId,
  canManage,
}: {
  sessionId: string | null
  tenantId: string
  canManage: boolean
}) => {
  const [cadence, setCadence] = useState<PostingCadence | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!sessionId) return
    try {
      setCadence(await fetchCadence(sessionId, tenantId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your posting rhythm')
    }
  }, [sessionId, tenantId])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (body: Parameters<typeof updateCadence>[2]) => {
    if (!sessionId || !canManage) return
    setBusy(true)
    try {
      await updateCadence(sessionId, tenantId, body)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  if (!cadence) {
    return error ? <p className="paragraph-xs text-error-primary px-3">{error}</p> : null
  }

  const done = cadence.this_week.published + cadence.this_week.scheduled
  const toggleDay = (day: Weekday) => {
    const cur = cadence.best_days
    const next = cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day].slice(-2)
    void save({ best_days: next })
  }

  return (
    <div className="border-t border-tertiary pt-3 mt-1 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="paragraph-sm text-primary">Posting rhythm</p>
          <p className="paragraph-xs text-quaternary">
            {done} of {cadence.posts_per_week} this week
            {cadence.this_week.queued_ahead > 0 ? ' · one lined up' : ''}
          </p>
        </div>
        <label className="flex items-center gap-2 shrink-0">
          <span className="paragraph-xs text-quaternary">Posts a week</span>
          <select
            id="posting-rhythm-per-week"
            value={cadence.posts_per_week}
            disabled={busy || !canManage}
            onChange={(e) => void save({ posts_per_week: Number(e.target.value) })}
            className="px-2 py-1 rounded-lg border border-primary bg-primary paragraph-xs text-primary"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="paragraph-xs text-quaternary">
          Best days{' '}
          {cadence.source.best_days === 'history'
            ? '· from your posts'
            : cadence.source.best_days === 'set'
              ? '· set by you'
              : '· pick up to two'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => {
            const on = cadence.best_days.includes(d.key)
            return (
              <button
                key={d.key}
                type="button"
                disabled={busy || !canManage}
                onClick={() => toggleDay(d.key)}
                aria-pressed={on}
                className={[
                  'px-2 py-1 rounded-lg paragraph-xs border transition-colors disabled:opacity-60',
                  on
                    ? 'bg-brand-solid text-primary-onbrand border-transparent'
                    : 'border-primary text-secondary hover:bg-tertiary',
                ].join(' ')}
              >
                {d.short}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="paragraph-sm text-primary">Remind me on my best day</p>
          <p className="paragraph-xs text-quaternary">
            One WhatsApp message a week at most, only when nothing is lined up.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || !canManage}
          onClick={() => void save({ nudge_enabled: !cadence.nudge_enabled })}
          aria-label="Toggle posting reminders"
          className={`relative shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
            cadence.nudge_enabled ? 'bg-utility-success-600' : 'bg-quaternary'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              cadence.nudge_enabled ? 'translate-x-4' : ''
            }`}
          />
        </button>
      </div>
      {error && <p className="paragraph-xs text-error-primary">{error}</p>}
    </div>
  )
}
