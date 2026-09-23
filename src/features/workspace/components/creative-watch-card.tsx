import { useCallback, useEffect, useState } from 'react'
import {
  addCreativeWatch,
  fetchCreativeWatches,
  removeCreativeWatch,
  type CreativeWatch,
} from '../services/posting-rhythm-service'

const field =
  'w-full px-3 py-2 rounded-lg border border-primary bg-primary paragraph-sm text-primary placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-utility-info-500'
const solid =
  'px-2.5 py-1.5 rounded-lg paragraph-xs bg-brand-solid text-primary-onbrand hover:opacity-90 transition-opacity disabled:opacity-50'
const ghost =
  'px-2.5 py-1.5 border border-primary rounded-lg paragraph-xs text-secondary hover:bg-tertiary transition-colors disabled:opacity-50'

/**
 * The folder door (loop step 5). Paste a link-shared Google Drive folder; each new image that
 * lands in it becomes a set of drafts in the approver's WhatsApp thread, once a day. Nothing
 * already in the folder is touched — the watch starts from now.
 */
export const CreativeWatchCard = ({
  sessionId,
  tenantId,
}: {
  sessionId: string | null
  tenantId: string
}) => {
  const [watches, setWatches] = useState<CreativeWatch[]>([])
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    try {
      setWatches(await fetchCreativeWatches(sessionId, tenantId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load watched folders')
    }
  }, [sessionId, tenantId])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 bg-secondary rounded-xl border border-tertiary space-y-3">
      <div>
        <p className="subheading-md text-primary">Watch a creative folder</p>
        <p className="paragraph-sm text-tertiary mt-0.5">
          Share a Google Drive folder with “Anyone with the link” and paste it here. Each new
          image dropped in becomes drafts in the approver’s WhatsApp, once a day. What’s already
          there is left alone.
        </p>
      </div>

      {watches.length > 0 && (
        <ul className="flex flex-col gap-2">
          {watches.map((w) => (
            <li key={w.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="paragraph-sm text-primary truncate">
                  {w.label || (w.kind === 'canva' ? 'Canva designs' : 'Drive folder')}
                </p>
                <p className="paragraph-xs text-quaternary">
                  {w.last_error
                    ? `Last check failed: ${w.last_error}`
                    : w.last_polled_at
                      ? `Checked ${new Date(w.last_polled_at).toLocaleDateString()} · ${w.seen} seen`
                      : 'Not checked yet · runs each morning'}
                </p>
              </div>
              <button
                type="button"
                className={ghost}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (sessionId) await removeCreativeWatch(sessionId, tenantId, w.id)
                  })
                }
              >
                Stop
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          id="creative-watch-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/…"
          className={field}
        />
        <button
          type="button"
          className={solid}
          disabled={busy || !url.trim()}
          onClick={() =>
            void run(async () => {
              if (!sessionId) return
              await addCreativeWatch(sessionId, tenantId, { url: url.trim() })
              setUrl('')
            })
          }
        >
          Watch
        </button>
      </div>
      {error && <p className="paragraph-xs text-error-primary">{error}</p>}
    </div>
  )
}
