import { useCallback, useEffect, useState } from 'react'
import { Globe01 } from '../../../components/icon/globe-01'
import { RefreshCw01 } from '../../../components/icon/refresh-cw-01'
import { Spinner } from '../../../components/spinner'
import { useToast } from '../../../contexts/toast-context'
import {
  fetchMarketingContext,
  readWebsite,
} from '../../marketing-context/services/marketing-context-service'
import type { WebsiteFacts, WebsiteScan } from '../../marketing-context/types'

interface Props {
  sessionId: string
  tenantId: string
  /** The website the workspace already has on file (empty when none). */
  websiteUrl: string
  canManage: boolean
  /** Fires once a read succeeds, with the URL that was read. */
  onWebsiteSaved?: (url: string) => void
  /** Jump to the Brand tab, where the colours, fonts, logo and voice can be edited. */
  onOpenBrandKit?: () => void
}

const READING_STEPS = [
  'Opening your website…',
  'Picking out your colours and fonts…',
  'Finding your logo…',
  'Learning your voice from the pages…',
  'Noting your prices, awards, events and news…',
  'Keeping your website photos…',
  'Saving it all to your brand kit…',
]

const ROLE_ORDER = ['Primary', 'Secondary', 'Accent', 'Highlight', 'Background', 'Text']

function sortPalette(p: WebsiteScan['palette']) {
  return [...(p ?? [])].sort(
    (a, b) => ROLE_ORDER.indexOf(a.name ?? '') - ROLE_ORDER.indexOf(b.name ?? '')
  )
}

function fmtWhen(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

/** Best-effort: load the site's fonts from Google Fonts so the specimen shows the real faces. */
function useGoogleFonts(names: Array<string | null | undefined>) {
  useEffect(() => {
    const wanted = names.filter((n): n is string => !!n && /^[A-Za-z0-9 ]{2,40}$/.test(n))
    if (!wanted.length) return
    const id = 'mia-brand-font-specimen'
    const href = `https://fonts.googleapis.com/css2?${wanted
      .map((n) => `family=${encodeURIComponent(n).replace(/%20/g, '+')}:wght@500;600`)
      .join('&')}&display=swap`
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    if (link.href !== href) link.href = href
  }, [names])
}

/**
 * Basic Settings → the "Website" row plus the paper board under it: the URL, a Read button, a
 * live progress line while Mia works (the read is a background job, so leaving the page is
 * fine), and a compact board on the home canvas's paper showing what she found — colours,
 * fonts, logo, voice — in the site's own faces. Prices, awards and events live under Brand.
 */
export const WebsiteReadCard = ({
  sessionId,
  tenantId,
  websiteUrl,
  canManage,
  onWebsiteSaved,
  onOpenBrandKit,
}: Props) => {
  const { showToast } = useToast()
  const [input, setInput] = useState(websiteUrl)
  const [editing, setEditing] = useState(!websiteUrl)
  const [scan, setScan] = useState<WebsiteScan | null>(null)
  const [facts, setFacts] = useState<WebsiteFacts | null>(null)
  const [loading, setLoading] = useState(true)
  const [reading, setReading] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setInput(websiteUrl)
    if (websiteUrl) setEditing(false)
  }, [websiteUrl])

  const pollUntilDone = useCallback(
    async (urlRead: string) => {
      setReading(true)
      for (let i = 0; i < 100; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        let ctx: Awaited<ReturnType<typeof fetchMarketingContext>> = null
        try {
          ctx = await fetchMarketingContext(sessionId, tenantId)
        } catch {
          continue
        }
        const ws = ctx?.website_scan ?? null
        if (!ws || ws.status === 'reading') continue
        setScan(ws)
        setFacts(ctx?.website_facts ?? null)
        setReading(false)
        if (ws.status === 'failed') {
          const msg = ws.error
            ? `Mia couldn't read that website: ${ws.error}`
            : "Mia couldn't read that website"
          setError(msg)
          showToast('error', msg)
        } else {
          setEditing(false)
          onWebsiteSaved?.(ws.url ?? urlRead)
          showToast('success', 'Done. Mia knows your colours, fonts, voice and facts now.')
        }
        return
      }
      setReading(false)
      setError('This is taking longer than expected. Refresh the page in a minute.')
    },
    [sessionId, tenantId, showToast, onWebsiteSaved]
  )

  useEffect(() => {
    let cancelled = false
    fetchMarketingContext(sessionId, tenantId)
      .then((ctx) => {
        if (!cancelled) {
          const ws = ctx?.website_scan ?? null
          setScan(ws)
          setFacts(ctx?.website_facts ?? null)
          if (ws?.status === 'reading') {
            const started = ws.started_at ? new Date(ws.started_at).getTime() : Date.now()
            setStep(Math.min(READING_STEPS.length - 1, Math.floor((Date.now() - started) / 7000)))
            void pollUntilDone(ws.url)
          }
        }
      })
      .catch(() => {
        /* the card still works without the last summary */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load; pollUntilDone is stable enough
  }, [sessionId, tenantId])

  useEffect(() => {
    if (!reading) return
    setStep(0)
    const id = window.setInterval(
      () => setStep((s) => Math.min(s + 1, READING_STEPS.length - 1)),
      7000
    )
    return () => window.clearInterval(id)
  }, [reading])

  const handleRead = async () => {
    const url = input.trim()
    if (!url) {
      setError('Type your website address first.')
      return
    }
    setError(null)
    setReading(true)
    try {
      const started = await readWebsite(sessionId, url, tenantId)
      if (started.status === 'reading') {
        await pollUntilDone(started.url ?? url)
      } else {
        setScan(started)
        setEditing(false)
        onWebsiteSaved?.(started.url ?? url)
        setReading(false)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Mia couldn't read that website"
      setError(msg)
      showToast('error', msg)
      setReading(false)
    }
  }

  const palette = sortPalette(scan?.palette)
  const fonts = scan?.fonts
  const voice = scan?.voice
  const logoUrl = scan?.applied?.logo_url ?? null
  const heading = fonts?.heading ?? null
  const body = fonts?.body && fonts.body !== fonts.heading ? fonts.body : null
  useGoogleFonts([heading, body])
  const hasFindings =
    !!scan && scan.status !== 'failed' && (palette.length > 0 || !!voice || !!heading)
  const pagesRead = Math.max(scan?.pages_scanned?.length ?? 0, facts?.pages_read?.length ?? 0)
  const counts = [
    facts?.offers?.length ? `${facts.offers.length} offers` : null,
    facts?.awards?.length ? `${facts.awards.length} awards` : null,
    facts?.history?.length ? `${facts.history.length} history facts` : null,
    facts?.events?.length ? `${facts.events.length} events` : null,
    scan?.site_photos?.seen ? `${scan.site_photos.seen} site photos` : null,
  ].filter((c): c is string => !!c)

  return (
    <div>
      {/* Row: icon · Website · url + when · actions */}
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-8 h-8 rounded-lg bg-tertiary flex items-center justify-center shrink-0 text-secondary">
          <Globe01 size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="subheading-md text-primary">Website</p>
          {editing || !websiteUrl ? (
            <p className="paragraph-xs text-quaternary">
              Mia reads it to learn your colours, fonts, logo, voice and facts.
            </p>
          ) : (
            <p className="paragraph-xs text-quaternary truncate">
              {websiteUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              {scan?.read_at ? ` · read ${fmtWhen(scan.read_at)}` : ''}
              {pagesRead ? ` · ${pagesRead} pages` : ''}
            </p>
          )}
        </div>
        {!editing && websiteUrl && canManage && (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={reading}
              className="px-2.5 py-1.5 border border-primary rounded-lg paragraph-xs text-secondary hover:bg-tertiary transition-colors disabled:opacity-50"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRead}
              disabled={reading}
              aria-label="Read the website again"
              className="px-2.5 py-1.5 border border-primary rounded-lg paragraph-xs text-secondary hover:bg-tertiary transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <RefreshCw01 size={13} className={reading ? 'animate-spin' : ''} />
              {reading ? 'Reading…' : 'Read again'}
            </button>
          </div>
        )}
      </div>

      {(editing || !websiteUrl) && (
        <div className="px-3 pb-3 flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://www.yourbusiness.co.za"
            disabled={reading || !canManage}
            onKeyDown={(e) => e.key === 'Enter' && !reading && handleRead()}
            className="flex-1 px-3 py-2 bg-primary border border-primary rounded-lg paragraph-sm text-primary placeholder:text-quaternary focus:outline-none focus:border-brand-solid disabled:opacity-60"
          />
          <div className="flex gap-2">
            {websiteUrl && (
              <button
                type="button"
                disabled={reading}
                onClick={() => {
                  setEditing(false)
                  setInput(websiteUrl)
                  setError(null)
                }}
                className="px-3 py-2 border border-primary rounded-lg paragraph-sm text-secondary hover:bg-tertiary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleRead}
              disabled={reading || !canManage || !input.trim()}
              className="px-3 py-2 bg-brand-solid text-primary-onbrand rounded-lg paragraph-sm hover:bg-brand-solid-hover transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {reading ? 'Reading…' : 'Read my website'}
            </button>
          </div>
        </div>
      )}
      {error && <p className="paragraph-sm text-error px-3 pb-3">{error}</p>}

      {reading && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-tertiary bg-primary px-3 py-2">
          <Spinner size="sm" variant="dark" />
          <div className="min-w-0">
            <p className="paragraph-sm text-secondary mia-fade-in" key={step}>
              {READING_STEPS[step]}
            </p>
            <p className="paragraph-xs text-quaternary">
              Takes a minute or two. You can leave this page — Mia keeps going.
            </p>
          </div>
        </div>
      )}

      {!reading && loading && (
        <div className="px-3 pb-3 flex items-center gap-2">
          <Spinner size="sm" variant="dark" />
          <p className="paragraph-xs text-quaternary">Loading what Mia knows…</p>
        </div>
      )}

      {/* The board: what Mia found, on the home canvas's paper */}
      {!reading && !loading && hasFindings && (
        <div className="mx-3 mb-3 relative rounded-lg brand-paper px-4 pt-3.5 pb-4">
          <p className="brand-paper-eyebrow">What Mia found</p>

          {palette.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {palette.map((c) => (
                <div key={`${c.name}-${c.hex}`} className="w-11 text-center">
                  <span
                    className="block h-11 rounded-lg border border-black/10 shadow-[0_1px_0_rgba(4,11,29,0.08)]"
                    style={{ background: c.hex }}
                    title={c.hex}
                  />
                  <span className="brand-paper-label block mt-1 truncate">{c.name}</span>
                </div>
              ))}
            </div>
          )}

          {(heading || body || voice?.one_liner || voice?.brand_voice) && (
            <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg brand-paper-tile px-3 py-2.5">
              <div className="leading-none">
                <span
                  className="text-[2.1rem] font-medium"
                  style={{ fontFamily: heading ? `"${heading}", Georgia, serif` : undefined }}
                >
                  Aa
                </span>
                {body && (
                  <span
                    className="ml-1.5 text-[0.85rem] font-semibold brand-paper-sub"
                    style={{ fontFamily: `"${body}", system-ui, sans-serif` }}
                  >
                    Aa
                  </span>
                )}
              </div>
              <div className="min-w-0 text-[0.8rem] leading-snug brand-paper-sub">
                {(heading || body) && (
                  <p>
                    {heading && (
                      <>
                        <span className="font-semibold text-[#040b1d]">{heading}</span> for headings
                      </>
                    )}
                    {heading && body && ' · '}
                    {body && (
                      <>
                        <span className="font-semibold text-[#040b1d]">{body}</span> for text
                      </>
                    )}
                  </p>
                )}
                {(voice?.brand_voice || voice?.one_liner) && (
                  <p className="mt-0.5 line-clamp-2">{voice?.brand_voice || voice?.one_liner}</p>
                )}
              </div>
            </div>
          )}

          {counts.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {counts.map((c) => (
                <span key={c} className="rounded-full brand-paper-tile px-2 py-0.5 text-[0.72rem]">
                  {c}
                </span>
              ))}
            </div>
          )}

          {logoUrl && (
            <div className="absolute right-3 top-3 w-[4.6rem] h-10 rounded-md brand-paper-tile flex items-center justify-center overflow-hidden">
              <img src={logoUrl} alt="Logo" className="max-w-[85%] max-h-[80%] object-contain" />
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[0.72rem] brand-paper-sub">
              {scan?.visual_error || scan?.voice_error || scan?.facts_error
                ? "Some parts didn't read this time — Read again usually fixes it."
                : 'Edit any of this under Brand.'}
            </p>
            {onOpenBrandKit && (
              <button
                type="button"
                onClick={onOpenBrandKit}
                className="rounded-md bg-brand-solid px-2.5 py-1 text-[0.72rem] font-semibold text-primary-onbrand hover:opacity-90"
              >
                Open Brand
              </button>
            )}
          </div>
        </div>
      )}

      {!reading && !loading && !hasFindings && websiteUrl && !editing && (
        <p className="paragraph-xs text-quaternary px-3 pb-3">
          Mia hasn&rsquo;t read this site yet. Tap &ldquo;Read again&rdquo; to pick up your colours,
          fonts, logo and voice.
        </p>
      )}
    </div>
  )
}
