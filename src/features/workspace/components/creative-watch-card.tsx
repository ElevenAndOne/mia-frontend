import { useCallback, useEffect, useState } from 'react'
import { useExperience } from '../hooks/use-experience'
import {
  addCreativeWatch,
  fetchCreativeWatchSetup,
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
 * The folder door (loop step 5). Basic: the owner's "Mia" folder in Google Drive, shared with
 * Mia's own address (or by link), with two folders inside: "Ideas & moodboard" (the look for
 * pictures Mia draws, never posted) and "Ready to post" (first in the Friday posts). Checked
 * hourly; teammates who upload are credited. Agency: each new image becomes drafts in the
 * approver's WhatsApp, once a day, starting from now.
 */
export const CreativeWatchCard = ({
  sessionId,
  tenantId,
}: {
  sessionId: string | null
  tenantId: string
}) => {
  const [watches, setWatches] = useState<CreativeWatch[]>([])
  const [shareWith, setShareWith] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // Basic: the folder feeds next week's posts. Agency: each picture becomes drafts that day.
  const { isBasic } = useExperience()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    try {
      const setup = await fetchCreativeWatchSetup(sessionId, tenantId)
      setWatches(setup.watches)
      setShareWith(setup.shareWith)
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
        <p className="subheading-md text-primary">{isBasic ? 'Your Mia folder' : 'Watch a creative folder'}</p>
        {isBasic ? (
          <div className="paragraph-sm text-tertiary mt-1 space-y-2">
            <p>
              Your team drops pictures in a Google Drive folder. <span className="text-primary">Ready to post</span> pictures
              go into your Friday posts first; <span className="text-primary">Ideas &amp; moodboard</span> sets the look of
              pictures Mia draws.
            </p>
            {/* The how-to only matters once (22 Oct 2026): open for a new owner, folded away once a folder is connected. */}
            <details open={watches.length === 0}>
              <summary className="paragraph-xs text-quaternary cursor-pointer select-none">How to set up the folder</summary>
              <ol className="list-decimal pl-5 space-y-1 mt-2 paragraph-xs">
                <li>
                  Make a folder called <span className="text-primary">Mia</span> with two folders inside:{' '}
                  <span className="text-primary">Ideas &amp; moodboard</span> and <span className="text-primary">Ready to post</span>.
                </li>
                <li>
                  {shareWith ? (
                    <>
                      Share it with <span className="text-primary break-all">{shareWith}</span>{' '}
                      <button
                        type="button"
                        className={ghost}
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(shareWith)
                            .then(() => setCopied(true))
                            .catch(() => setCopied(false))
                        }}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>{' '}
                      (Viewer), and your team as editors.
                    </>
                  ) : (
                    <>Share it as “Anyone with the link”, and your team as editors.</>
                  )}
                </li>
                <li>Paste its link below.</li>
              </ol>
            </details>
          </div>
        ) : (
          <p className="paragraph-sm text-tertiary mt-0.5">
            Share a Google Drive folder with “Anyone with the link” and paste it here. Each new image dropped in
            becomes drafts in the approver’s WhatsApp, once a day. What’s already there is left alone.
          </p>
        )}
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
                      ? `Checked ${new Date(w.last_polled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · ${w.seen} picture${w.seen === 1 ? '' : 's'} taken in`
                      : w.mode === 'ideas'
                        ? 'Not checked yet · within the hour'
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
