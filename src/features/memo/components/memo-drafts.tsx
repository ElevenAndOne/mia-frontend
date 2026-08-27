import { useCallback, useMemo, useState } from 'react'
import { Button } from '../../../components/button'
import type { ScheduleDraftInput } from '../services/memo-service'
import type { MemoDraftDocument, MemoDrafts as MemoDraftsData } from '../types'

interface MemoDraftsProps {
  drafts: MemoDraftsData
  canManage: boolean
  onSchedule?: (input: ScheduleDraftInput) => Promise<unknown>
  /** Open a draft in the docked canvas (memo page keeps the reader in place). */
  onOpen: (conversationId: string, documentId?: string) => void
}

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Next occurrence of the memo's best weekday at 09:00 local, else tomorrow 10:00,
 *  always at least an hour out — the scheduler refuses anything under 10 minutes. */
const suggestedDate = (bestWeekday?: string | null): Date => {
  const now = new Date()
  const d = new Date(now)
  const idx = bestWeekday ? DOW.indexOf(bestWeekday) : -1
  if (idx >= 0) {
    let ahead = (idx - now.getDay() + 7) % 7
    if (ahead === 0 && now.getHours() >= 8) ahead = 7
    d.setDate(now.getDate() + ahead)
    d.setHours(9, 0, 0, 0)
  } else {
    d.setDate(now.getDate() + 1)
    d.setHours(10, 0, 0, 0)
  }
  if (d.getTime() - now.getTime() < 60 * 60 * 1000) d.setTime(now.getTime() + 60 * 60 * 1000)
  return d
}

const pad = (n: number) => String(n).padStart(2, '0')
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

const whenLabel = (iso: string | null | undefined): string => {
  if (!iso) return 'scheduled'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface DraftTileProps {
  doc: MemoDraftDocument
  bestWeekday?: string | null
  canManage: boolean
  onOpen: () => void
  onSchedule?: (input: ScheduleDraftInput) => Promise<unknown>
}

const DraftTile = ({ doc, bestWeekday, canManage, onOpen, onSchedule }: DraftTileProps) => {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const initial = useMemo(() => suggestedDate(bestWeekday), [bestWeekday])
  const [date, setDate] = useState(toDateInput(initial))
  const [time, setTime] = useState(toTimeInput(initial))
  const [platform, setPlatform] = useState<'facebook' | 'instagram'>(
    doc.platform.toLowerCase() === 'instagram' ? 'instagram' : 'facebook',
  )
  const isVideoBrief = ['video', 'reel', 'story', 'animation'].includes(doc.format.toLowerCase())
  const igNeedsImage = platform === 'instagram'
  const needsMedia = igNeedsImage || isVideoBrief

  const submit = useCallback(async () => {
    if (!onSchedule || busy) return
    const when = new Date(`${date}T${time}:00`)
    if (Number.isNaN(when.getTime())) return
    setBusy(true)
    try {
      await onSchedule({
        document_id: doc.document_id,
        platform,
        scheduled_at: when.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      setOpen(false)
    } catch {
      // the hook already toasts the error
    } finally {
      setBusy(false)
    }
  }, [onSchedule, busy, date, time, doc.document_id, platform])

  return (
    <div className="rounded-lg border border-secondary bg-primary/40 p-3 flex flex-col gap-2">
      <button type="button" onClick={onOpen} className="text-left">
        <p className="label-sm text-primary">{doc.title}</p>
        <p className="paragraph-xs text-quaternary mt-0.5">
          {doc.platform} · {doc.format}
        </p>
        <p className="paragraph-xs text-tertiary mt-1.5 line-clamp-3">{doc.preview}</p>
      </button>

      {doc.scheduled ? (
        <p className="paragraph-xs text-success">Scheduled · {whenLabel(doc.scheduled.scheduled_at)}</p>
      ) : canManage && onSchedule ? (
        open ? (
          <div className="flex flex-col gap-2 pt-2 border-t border-secondary">
            <div className="flex gap-2 flex-wrap">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as 'facebook' | 'instagram')}
                className="paragraph-xs bg-primary border border-secondary rounded-md px-2 py-1 text-primary"
                aria-label="Publish to"
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
              </select>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="paragraph-xs bg-primary border border-secondary rounded-md px-2 py-1 text-primary"
                aria-label="Date"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="paragraph-xs bg-primary border border-secondary rounded-md px-2 py-1 text-primary"
                aria-label="Time"
              />
            </div>
            {bestWeekday && (
              <p className="paragraph-xs text-quaternary">Mia suggests {bestWeekday} 09:00 — your posts land best then.</p>
            )}
            {isVideoBrief ? (
              <p className="paragraph-xs text-warning">
                This is a {doc.format.toLowerCase()} brief — attach the {doc.format.toLowerCase()} in the canvas first,
                or it would publish as text only.
              </p>
            ) : igNeedsImage ? (
              <p className="paragraph-xs text-warning">
                Instagram needs an image — open this draft in the canvas to add one, then schedule there.
              </p>
            ) : null}
            <div className="flex gap-2 items-center">
              <Button size="sm" variant="primary" loading={busy} disabled={needsMedia} onClick={submit}>
                Approve &amp; schedule
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            {needsMedia ? (
              <Button size="sm" variant="primary" onClick={onOpen}>
                {isVideoBrief ? 'Attach video' : 'Add image'} &amp; schedule
              </Button>
            ) : (
              <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
                Schedule
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onOpen}>
              Edit in canvas
            </Button>
          </div>
        )
      ) : null}
    </div>
  )
}

/** The three posts Mia drafted from a finding: schedule inline, or open the
 *  canvas conversation to edit them first. */
export const MemoDrafts = ({ drafts, canManage, onSchedule, onOpen }: MemoDraftsProps) => {
  const docs = drafts.documents ?? []
  if (docs.length === 0) return null
  const openCanvas = (documentId?: string) => onOpen(drafts.conversation_id, documentId)
  const scheduled = docs.filter((d) => d.scheduled).length

  return (
    <div className="mt-3.5 pt-3.5 border-t border-secondary flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="label-xs uppercase tracking-wider text-quaternary">
          Mia drafted {docs.length} post{docs.length === 1 ? '' : 's'} from this
          {scheduled > 0 ? ` · ${scheduled} scheduled` : ''}
        </p>
        <Button size="sm" variant="secondary" onClick={() => openCanvas()}>
          Open in canvas
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {docs.map((d) => (
          <DraftTile
            key={d.document_id}
            doc={d}
            bestWeekday={drafts.best_weekday}
            canManage={canManage}
            onOpen={() => openCanvas(d.document_id)}
            onSchedule={onSchedule}
          />
        ))}
      </div>
    </div>
  )
}
