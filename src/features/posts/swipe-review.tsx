import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/button'
import { Spinner } from '../../components/spinner'
import { useSession } from '../../contexts/session-context'
import { useToast } from '../../contexts/toast-context'
import { decideWeeklyItem, type WeeklyPlan, type WeeklyPlanItem } from './services/posts-api'

const PLATFORM_LABEL: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram' }
const SWIPE_AT = 110 // px of drag that counts as a decision

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/**
 * Next week's posts one at a time, full screen (the swipe screen, 15 Oct 2026). Swipe right or
 * tap Book it to book, swipe left or tap Skip to skip (then "keep the photo as an idea?"), Change
 * to say what to change. Arrow keys on a computer. The same plan the owner reviews on WhatsApp,
 * so whichever is used first wins.
 */
export const SwipeReview = ({
  plan,
  onPlan,
  onClose,
}: {
  plan: WeeklyPlan
  onPlan: (p: WeeklyPlan) => void
  onClose: () => void
}) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const [dx, setDx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState<'keep' | 'change' | null>(null)
  const [instruction, setInstruction] = useState('')
  const start = useRef<number | null>(null)

  const pending = plan.items.filter((i) => i.decision === 'pending')
  const item: WeeklyPlanItem | undefined = pending[0]
  const done = plan.items.length - pending.length

  const act = async (body: { action: 'book' | 'skip' | 'change'; keep_idea?: boolean; instruction?: string }) => {
    if (!sessionId || !activeWorkspace || !item || busy) return
    setBusy(true)
    try {
      const r = await decideWeeklyItem(sessionId, activeWorkspace.tenant_id, plan.id, item.i, body)
      onPlan(r.plan)
      if (body.action === 'change') showToast('success', r.message)
      setAsking(null)
      setInstruction('')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
      setDx(0)
    }
  }

  const book = () => void act({ action: 'book' })
  // A skipped post's photo can go back into the ideas for another week (Josh, 14 Oct 2026).
  const skip = () => (item?.source === 'drawn' ? void act({ action: 'skip', keep_idea: false }) : setAsking('keep'))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (asking || busy) return
      if (e.key === 'ArrowRight') book()
      if (e.key === 'ArrowLeft') skip()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const booked = plan.items.filter((i) => i.decision === 'booked').length
  const skipped = plan.items.filter((i) => i.decision === 'skipped').length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-primary" role="dialog" aria-label="Next week's posts">
      <div className="flex items-center justify-between px-4 py-3 border-b border-tertiary">
        <span className="paragraph-sm text-tertiary">
          {item ? `Post ${done + 1} of ${plan.items.length}` : 'All done'}
        </span>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {!item ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="subheading-md text-primary">
            Booked {booked}
            {skipped ? `, skipped ${skipped}` : ''}.
          </p>
          <p className="paragraph-sm text-tertiary">They’re in Scheduled. Have a good weekend.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-1 items-center justify-center overflow-hidden px-4 py-4">
            <article
              className="relative w-full max-w-md touch-pan-y select-none overflow-hidden rounded-xl border border-secondary bg-primary shadow-lg transition-transform"
              style={{
                transform: `translateX(${dx}px) rotate(${dx / 25}deg)`,
                transition: start.current === null ? 'transform 0.2s' : 'none',
              }}
              onPointerDown={(e) => {
                if (asking || busy) return
                start.current = e.clientX
                ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
              }}
              onPointerMove={(e) => {
                if (start.current !== null) setDx(e.clientX - start.current)
              }}
              onPointerUp={() => {
                const moved = dx
                start.current = null
                if (moved > SWIPE_AT) book()
                else if (moved < -SWIPE_AT) skip()
                else setDx(0)
              }}
            >
              {item.photo_url && (
                <img src={item.photo_url} alt="" draggable={false} className="block max-h-[45vh] w-full object-cover" />
              )}
              <div className="flex flex-col gap-2 p-4">
                <p className="label-xs font-semibold text-quaternary">
                  {when(item.slot_at)} · {PLATFORM_LABEL[item.platform] ?? item.platform}
                  {item.source === 'idea' ? ' · from a saved idea' : item.source === 'drawn' ? ' · a picture Mia drew' : ''}
                </p>
                <p className="paragraph-sm text-primary whitespace-pre-wrap break-words">
                  {item.copy}
                  {item.hashtags ? `\n\n${item.hashtags}` : ''}
                </p>
              </div>
              {dx !== 0 && (
                <span
                  className={`pointer-events-none absolute top-6 rounded-md px-3 py-1 label-md font-bold ${
                    dx > 0 ? 'left-6 bg-utility-success-500 text-white' : 'right-6 bg-utility-error-500 text-white'
                  }`}
                  style={{ opacity: Math.min(1, Math.abs(dx) / SWIPE_AT) }}
                >
                  {dx > 0 ? 'BOOK' : 'SKIP'}
                </span>
              )}
            </article>
          </div>

          <div className="border-t border-tertiary px-4 py-3">
            {asking === 'keep' ? (
              <div className="flex flex-col items-center gap-2">
                <p className="paragraph-sm text-primary">Skipped. Keep the photo as an idea for another week?</p>
                <div className="flex gap-2">
                  <Button size="sm" disabled={busy} onClick={() => void act({ action: 'skip', keep_idea: true })}>
                    Keep as an idea
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => void act({ action: 'skip', keep_idea: false })}>
                    No thanks
                  </Button>
                </div>
              </div>
            ) : asking === 'change' ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (instruction.trim()) void act({ action: 'change', instruction })
                }}
              >
                <input
                  autoFocus
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="What should change? Like “shorter” or “mention the special”"
                  className="w-full rounded-lg border border-primary bg-primary px-3 py-2 paragraph-sm text-primary"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" type="button" onClick={() => setAsking(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" disabled={busy || !instruction.trim()}>
                    {busy ? <Spinner /> : 'Change it'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Button variant="secondary" disabled={busy} onClick={skip}>
                  Skip
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => setAsking('change')}>
                  Change it
                </Button>
                <Button disabled={busy} onClick={book}>
                  Book it
                </Button>
              </div>
            )}
            <p className="mt-2 text-center paragraph-xs text-quaternary">Swipe right to book, left to skip.</p>
          </div>
        </>
      )}
    </div>
  )
}
