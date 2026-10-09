import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Modal } from '../../overlay'
import { Button } from '../../../components/button'
import { Spinner } from '../../../components/spinner'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import {
  draftDocumentWords,
  fetchDocumentWords,
  saveDocumentWords,
  type DocumentWordsInfo,
  type PictureWords,
  type PictureWordsPosition,
  type PictureWordsStyle,
} from '../services/chat-service'

/**
 * Words on the picture of a canvas post (8 Oct 2026).
 *
 * The words are a layer over the post's clean photo: drag them (they snap to top, middle or
 * bottom), click to type, pick a style, font, size and the brand's colours. The preview is the
 * browser itself, so editing is instant; Save asks the backend to draw the same template onto
 * the clean photo (services/picture_words) and keeps it as a new version. The photo is never
 * redrawn, and "Take the words off" gives it back exactly.
 *
 * The CSS below mirrors the backend templates (sizes in cqmin, so a wide photo isn't shouted).
 */

const STYLES: { id: PictureWordsStyle; label: string; hint: string }[] = [
  { id: 'band', label: 'Headline', hint: 'Across the top or bottom' },
  { id: 'event', label: 'Event', hint: 'A date, time or place' },
  { id: 'tag', label: 'Label', hint: 'A short tag' },
  { id: 'badge', label: 'Offer', hint: 'A price in a circle' },
  { id: 'quote', label: 'Quote', hint: 'A review over the middle' },
  { id: 'note', label: 'Note', hint: 'Handwritten, for personal posts' },
]

const SIZES: { id: PictureWords['size']; label: string; scale: number }[] = [
  { id: 's', label: 'S', scale: 0.8 },
  { id: 'm', label: 'M', scale: 1 },
  { id: 'l', label: 'L', scale: 1.2 },
]

const ZONES: PictureWordsPosition[] = ['top', 'middle', 'bottom']

const EMPTY: PictureWords = {
  style: 'band',
  headline: '',
  kicker: '',
  sub: '',
  items: [],
  position: 'top',
  font: '',
  text: '',
  panel: '',
  accent: '',
  size: 'm',
  logo: false,
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return `rgba(30,20,14,${alpha})`
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha})`
}

function loadFont(family: string) {
  if (!family) return
  const id = `pw-font-${family.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@500;600;700;800&display=swap`
  document.head.appendChild(link)
}

interface WordsEditorProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  conversationId: string | null
  /** Called after a save so the canvas shows the new version. */
  onSaved: () => void
}

export function WordsEditor({ isOpen, onClose, documentId, conversationId, onSaved }: WordsEditorProps) {
  const { sessionId } = useSession()
  const { showToast } = useToast()
  const [info, setInfo] = useState<DocumentWordsInfo | null>(null)
  const [words, setWords] = useState<PictureWords>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [ratio, setRatio] = useState(4 / 5)
  const [dragZone, setDragZone] = useState<PictureWordsPosition | null>(null)
  const postRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  useEffect(() => {
    if (!isOpen || !sessionId) return
    setLoading(true)
    fetchDocumentWords(sessionId, documentId)
      .then((data) => {
        setInfo(data)
        const start = data.words
          ? { ...EMPTY, ...data.words }
          : { ...EMPTY, style: (data.personal ? 'note' : 'band') as PictureWordsStyle, position: data.suggested_position ?? 'top' }
        if (start.position === 'auto') start.position = data.suggested_position ?? 'top'
        setWords(start)
      })
      .catch((e: Error) => showToast('error', e.message))
      .finally(() => setLoading(false))
  }, [isOpen, sessionId, documentId, showToast])

  const look = info?.look ?? {}
  const font = words.font || (words.style === 'note' ? 'Caveat' : look.font || 'Geologica')
  useEffect(() => loadFont(font), [font])

  const panel = words.panel || look.panel || '#2B1D14'
  const text = words.text || look.text || '#FFFFFF'
  const accent = words.accent || look.accent || text
  const scale = SIZES.find((s) => s.id === words.size)?.scale ?? 1

  const set = useCallback((patch: Partial<PictureWords>) => setWords((w) => ({ ...w, ...patch })), [])

  const zoneAt = (clientY: number): PictureWordsPosition => {
    const r = postRef.current?.getBoundingClientRect()
    if (!r) return 'top'
    const f = (clientY - r.top) / r.height
    return f < 1 / 3 ? 'top' : f < 2 / 3 ? 'middle' : 'bottom'
  }
  const onLayerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).isContentEditable) return
    dragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDragZone(zoneAt(e.clientY))
  }
  const onLayerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) setDragZone(zoneAt(e.clientY))
  }
  const onLayerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    set({ position: zoneAt(e.clientY) })
    setDragZone(null)
  }

  const suggest = async () => {
    if (!sessionId) return
    setDrafting(true)
    try {
      const drafted = await draftDocumentWords(sessionId, documentId, conversationId)
      setWords((w) => ({ ...w, ...drafted, position: drafted.position === 'auto' ? w.position : drafted.position, font: w.font, text: w.text, panel: w.panel, accent: w.accent }))
    } catch (e) {
      showToast('error', (e as Error).message)
    } finally {
      setDrafting(false)
    }
  }

  const save = async (next: PictureWords | null) => {
    if (!sessionId) return
    if (next && !next.headline.trim()) {
      showToast('error', 'Type the words first.')
      return
    }
    setSaving(true)
    try {
      const res = await saveDocumentWords(sessionId, documentId, conversationId, next)
      if (res.font_missing) showToast('info', `${res.font_missing} isn't available, so ${res.font} was used.`)
      showToast('success', next ? 'Words saved on the picture.' : 'Words taken off. The photo is back as it was.')
      onSaved()
      onClose()
    } catch (e) {
      showToast('error', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const swatches = useMemo(() => {
    const brand = look.panel
      ? [{ id: 'brand', label: 'Brand', panel: look.panel, text: look.text || '#FFFFFF', accent: look.accent || '' }]
      : []
    return [
      ...brand,
      { id: 'dark', label: 'Dark', panel: '#111111', text: '#FFFFFF', accent: '#F5B700' },
      { id: 'light', label: 'Light', panel: '#FAF7F0', text: '#1B1B1B', accent: '#9A5B12' },
    ]
  }, [look.panel, look.text, look.accent])

  const photo = info?.clean_media_url ?? null
  const layerPos = words.style === 'quote' ? 'middle' : words.position

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Words on the picture" size="full" panelClassName="max-w-4xl w-full">
      <style>{EDITOR_CSS}</style>
      {loading || !info ? (
        <div className="p-10 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : !photo ? (
        <p className="p-6 paragraph-md text-secondary">This post has no photo yet. Add one, then put words on it.</p>
      ) : (
        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="p-5 bg-secondary flex flex-col items-center gap-2 min-w-0">
            <div
              ref={postRef}
              className="pw-post w-full max-w-[440px] rounded-lg overflow-hidden shadow-lg"
              style={{ aspectRatio: String(ratio) }}
            >
              <img
                src={photo}
                alt="The post's photo"
                className="pw-photo"
                onLoad={(e) => {
                  const i = e.currentTarget
                  if (i.naturalWidth && i.naturalHeight) setRatio(i.naturalWidth / i.naturalHeight)
                }}
              />
              {ZONES.map((z) => (
                <div key={z} className={`pw-snap pw-snap-${z} ${dragZone ? 'show' : ''} ${dragZone === z ? 'on' : ''}`} />
              ))}
              <div
                className={`pw-safe ${ratio <= 1 / 1.6 ? 'story' : ''}`}
              >
                <div
                  role="group"
                  aria-label="Words layer: drag to move, click the words to type"
                  tabIndex={0}
                  onPointerDown={onLayerDown}
                  onPointerMove={onLayerMove}
                  onPointerUp={onLayerUp}
                  onKeyDown={(e) => {
                    const i = ZONES.indexOf(words.position)
                    if (e.key === 'ArrowUp' && i > 0) set({ position: ZONES[i - 1] })
                    if (e.key === 'ArrowDown' && i < 2) set({ position: ZONES[i + 1] })
                  }}
                  className={`pw-ov pw-${words.style} pw-at-${layerPos}`}
                  style={
                    {
                      '--p': hexToRgba(panel, words.style === 'quote' ? 0.5 : 0.93),
                      '--ps': panel,
                      '--t': text,
                      '--a': accent,
                      '--f': `'${font}'`,
                      '--z': scale,
                    } as React.CSSProperties
                  }
                >
                  {words.kicker && ['band', 'event'].includes(words.style) && <div className="pw-k">{words.kicker}</div>}
                  <div
                    className="pw-h"
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    onBlur={(e) => set({ headline: e.currentTarget.textContent ?? '' })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.currentTarget.blur()
                      }
                    }}
                  >
                    {words.headline || 'Type your words'}
                  </div>
                  {words.sub && ['band', 'event', 'badge', 'quote'].includes(words.style) && <div className="pw-s">{words.sub}</div>}
                </div>
              </div>
            </div>
            <p className="paragraph-xs text-tertiary text-center">
              Drag the words to move them. Click them to type. The photo itself never changes.
            </p>
          </div>

          <div className="p-5 border-t md:border-t-0 md:border-l border-secondary flex flex-col gap-4 min-w-0">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pw-headline" className="label-xs text-tertiary uppercase tracking-wide">Words</label>
              <input
                id="pw-headline"
                value={words.headline}
                onChange={(e) => set({ headline: e.target.value })}
                placeholder="Open this Sunday"
                className="rounded-lg border border-primary bg-primary px-3 py-2 paragraph-sm text-primary"
              />
              {['band', 'event'].includes(words.style) && (
                <input
                  aria-label="Small line above"
                  value={words.kicker}
                  onChange={(e) => set({ kicker: e.target.value })}
                  placeholder="Small line above (optional)"
                  className="rounded-lg border border-primary bg-primary px-3 py-2 paragraph-sm text-primary"
                />
              )}
              {['band', 'event', 'badge', 'quote'].includes(words.style) && (
                <input
                  aria-label="Small line below"
                  value={words.sub}
                  onChange={(e) => set({ sub: e.target.value })}
                  placeholder="Small line below (optional)"
                  className="rounded-lg border border-primary bg-primary px-3 py-2 paragraph-sm text-primary"
                />
              )}
              <Button variant="ghost" size="sm" onClick={suggest} loading={drafting}>
                Suggest words from the post
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="label-xs text-tertiary uppercase tracking-wide">Style</span>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Style">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.hint}
                    aria-pressed={words.style === s.id}
                    onClick={() => set({ style: s.id })}
                    className={`rounded-lg border px-2 py-2 paragraph-xs font-semibold transition-colors ${
                      words.style === s.id ? 'border-brand bg-brand-secondary text-brand-secondary' : 'border-primary bg-primary text-secondary hover:bg-secondary'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pw-font" className="label-xs text-tertiary uppercase tracking-wide">Font</label>
              <select
                id="pw-font"
                value={words.font || ''}
                onChange={(e) => set({ font: e.target.value })}
                className="rounded-lg border border-primary bg-primary px-3 py-2 paragraph-sm text-primary"
              >
                <option value="">{info.brand_font ? `${info.brand_font} (Brand Kit)` : 'Mia\'s default'}</option>
                {info.fonts.filter((f) => f !== info.brand_font).map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="label-xs text-tertiary uppercase tracking-wide">Size</span>
                <div className="flex gap-1.5" role="group" aria-label="Size">
                  {SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={words.size === s.id}
                      onClick={() => set({ size: s.id })}
                      className={`w-9 rounded-full border py-1 paragraph-xs font-semibold ${
                        words.size === s.id ? 'bg-primary-solid text-primary-onbrand border-transparent' : 'border-primary text-secondary'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="label-xs text-tertiary uppercase tracking-wide">Colours</span>
                <div className="flex gap-1.5" role="group" aria-label="Colours">
                  {swatches.map((sw) => {
                    const on = (words.panel || look.panel || '#2B1D14') === sw.panel
                    return (
                      <button
                        key={sw.id}
                        type="button"
                        title={sw.label}
                        aria-label={`${sw.label} colours`}
                        aria-pressed={on}
                        onClick={() => set(sw.id === 'brand' ? { panel: '', text: '', accent: '' } : { panel: sw.panel, text: sw.text, accent: sw.accent })}
                        className={`h-7 w-7 rounded-md border-2 ${on ? 'border-brand' : 'border-secondary'}`}
                        style={{ background: sw.panel }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Button variant="primary" onClick={() => save(words)} loading={saving} fullWidth>
                Save on the picture
              </Button>
              {info.words && (
                <Button variant="secondary" onClick={() => save(null)} disabled={saving} fullWidth>
                  Take the words off
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// Mirrors services/picture_words.py's templates. cqmin: sized by the photo's shorter side.
const EDITOR_CSS = `
.pw-post{position:relative;container-type:size;background:#222}
.pw-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;user-select:none}
.pw-safe{position:absolute;left:0;right:0;top:0;bottom:0;container-type:size}
.pw-safe.story{top:14%;bottom:20%}
.pw-snap{position:absolute;left:0;right:0;height:33.34%;border:2px dashed rgba(255,255,255,.7);background:rgba(255,255,255,.08);display:none;pointer-events:none;z-index:2}
.pw-snap.show{display:block}.pw-snap.on{background:rgba(255,255,255,.22)}
.pw-snap-top{top:0}.pw-snap-middle{top:33.33%}.pw-snap-bottom{top:66.66%}
.pw-ov{position:absolute;cursor:grab;touch-action:none;user-select:none;font-family:var(--f),sans-serif;outline-offset:-4px}
.pw-ov:focus-visible{outline:2px dashed #fff}
.pw-h{outline:none;cursor:text;user-select:text}
.pw-band{left:0;right:0;padding:6cqmin 7cqmin 7cqmin;color:var(--t)}
.pw-band.pw-at-top{top:0;background:linear-gradient(to bottom,var(--p) 64%,transparent)}
.pw-band.pw-at-bottom{bottom:0;background:linear-gradient(to top,var(--p) 64%,transparent)}
.pw-band.pw-at-middle{top:50%;transform:translateY(-50%);background:var(--p);padding:5cqmin 7cqmin}
.pw-band .pw-k{font:700 3.3cqmin 'Geologica',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--a)}
.pw-band .pw-h{font-weight:800;font-size:calc(9.6cqmin * var(--z));line-height:1.04;margin-top:1.4cqmin;text-wrap:balance}
.pw-band .pw-s{font:500 3.5cqmin 'Geologica',sans-serif;margin-top:2.2cqmin;opacity:.88}
.pw-event{left:6cqmin;right:18cqmin;background:var(--t);color:var(--ps);border-radius:2cqmin;padding:5cqmin 6cqmin;border-top:1.4cqmin solid var(--a)}
.pw-event.pw-at-top{top:6cqmin}.pw-event.pw-at-middle{top:35%}.pw-event.pw-at-bottom{bottom:6cqmin}
.pw-event .pw-k{font:700 3cqmin 'Geologica',sans-serif;letter-spacing:.16em;text-transform:uppercase;opacity:.75}
.pw-event .pw-h{font-weight:800;font-size:calc(8cqmin * var(--z));line-height:1.06;margin-top:1.4cqmin;text-wrap:balance}
.pw-event .pw-s{font:600 3.8cqmin 'Geologica',sans-serif;margin-top:2.4cqmin}
.pw-quote{inset:0;display:grid;place-content:center;padding:12cqmin;background:var(--p);color:var(--t);text-align:center}
.pw-quote .pw-h{font-weight:700;font-style:italic;font-size:calc(8.4cqmin * var(--z));line-height:1.16;text-wrap:balance}
.pw-quote .pw-s{font:700 3.2cqmin 'Geologica',sans-serif;letter-spacing:.16em;text-transform:uppercase;margin-top:5cqmin;color:var(--a)}
.pw-tag{left:6cqmin;background:var(--a);color:var(--ps);border-radius:99cqmin;padding:2.2cqmin 4.6cqmin;max-width:80cqmin}
.pw-tag .pw-h{font-weight:700;font-size:calc(4.6cqmin * var(--z))}
.pw-tag.pw-at-top{top:6cqmin}.pw-tag.pw-at-middle{top:46%}.pw-tag.pw-at-bottom{bottom:6cqmin}
.pw-badge{right:7cqmin;width:36cqmin;height:36cqmin;border-radius:50%;background:var(--ps);color:var(--t);display:grid;place-content:center;text-align:center;transform:rotate(-8deg);padding:3cqmin;box-shadow:0 1cqmin 4cqmin rgba(0,0,0,.35)}
.pw-badge.pw-at-top,.pw-badge.pw-at-middle{top:7cqmin}.pw-badge.pw-at-bottom{bottom:7cqmin}
.pw-badge .pw-h{font-weight:800;font-size:calc(8.5cqmin * var(--z));line-height:1}
.pw-badge .pw-s{font:700 2.8cqmin 'Geologica',sans-serif;letter-spacing:.12em;text-transform:uppercase;margin-top:1.4cqmin;color:var(--a)}
.pw-note{left:7cqmin;right:7cqmin;background:rgba(255,253,247,.95);color:#2b2b2b;padding:3cqmin 5cqmin 3.6cqmin;transform:rotate(-1.6deg);box-shadow:0 1cqmin 3cqmin rgba(0,0,0,.25);text-align:center}
.pw-note .pw-h{font-weight:700;font-size:calc(8cqmin * var(--z));line-height:1.05}
.pw-note.pw-at-top{top:8cqmin}.pw-note.pw-at-middle{top:40%}.pw-note.pw-at-bottom{bottom:8cqmin}
`
