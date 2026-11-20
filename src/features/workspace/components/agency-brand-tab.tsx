import { sessionCache } from '../../../utils/session-cache'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '../../../components/button'
import { Spinner } from '../../../components/spinner'
import { ChevronLeft } from '../../../components/icon/chevron-left'
import { ChevronRight } from '../../../components/icon/chevron-right'
import { apiFetch } from '../../../utils/api'
import { useToast } from '../../../contexts/toast-context'
import { useMarketingContext } from '../../marketing-context/hooks/use-marketing-context'
import type { BrandGuideExtracted } from '../../marketing-context/types'
import { FIELD_LABELS } from '../../marketing-context/types'
import { ContextFieldsEditor } from '../../marketing-context/views/context-fields-editor'
import { BrandKitTab } from './brand-kit-tab'
import { BrandFactsCard } from './brand-facts-card'
import { BrandFontsRow } from './brand-fonts-row'
import type { FontStatus, OwnFont } from './brand-fonts'
import { BrandGuideModal } from './brand-guide-modal'
import { Card, Disclosure } from './settings-ui'
import { day } from '../../campaign-builder/components/parts'

/**
 * Workspace Settings → Brand, agency (19 Nov 2026). One page for what used to be Brand Guide,
 * Brand Kit and the brand facts:
 *
 *   1. The guide itself: an uploaded PDF shown as its own pages, one at a time. No upload: build
 *      one from the client's website. An upload always wins over a website read.
 *   2. Logo, colours and fonts (the Brand Kit), with "read them from the guide" and own fonts.
 *   3. What Mia knows, in closed groups opened one at a time, then the facts and baselines.
 *
 * Basic has its own Brand tab (basic-brand-tab.tsx); this is never shown there.
 */

interface Props {
  sessionId: string | null
  tenantId: string
  canManage: boolean
}

interface GuideLook {
  main?: string | null
  accent?: string | null
  heading_font?: string | null
  body_font?: string | null
  taglines: string[]
}

interface VisualGuide {
  status: 'none' | 'building' | 'ready' | 'failed'
  step?: string | null
  error?: string | null
  website?: string | null
  built_at?: string | null
  pages: number
  look?: GuideLook | null
  edits?: Record<string, unknown>
}

const FONT_SHELF = ['Inter', 'Outfit', 'DM Sans', 'Manrope', 'Poppins', 'Montserrat', 'Nunito', 'Quicksand', 'Fraunces',
  'Playfair Display', 'Lora', 'Roboto Slab', 'Bebas Neue', 'Oswald']

/** Owner/admin changes to the drawn guide: colours, fonts, lead tagline. The pages redraw. */
const GuideEditor = ({
  look,
  ownFonts,
  edited,
  saving,
  onSave,
  onReset,
}: {
  look: GuideLook
  ownFonts: string[]
  edited: boolean
  saving: boolean
  onSave: (changes: Record<string, string>) => void
  onReset: () => void
}) => {
  const [main, setMain] = useState(look.main ?? '#000000')
  const [accent, setAccent] = useState(look.accent ?? '#000000')
  const [heading, setHeading] = useState(look.heading_font ?? '')
  const [body, setBody] = useState(look.body_font ?? '')
  const [tagline, setTagline] = useState(look.taglines[0] ?? '')
  useEffect(() => {
    setMain(look.main ?? '#000000')
    setAccent(look.accent ?? '#000000')
    setHeading(look.heading_font ?? '')
    setBody(look.body_font ?? '')
    setTagline(look.taglines[0] ?? '')
  }, [look])
  const changes: Record<string, string> = {}
  if (main.toUpperCase() !== (look.main ?? '').toUpperCase()) changes.main = main.toUpperCase()
  if (accent.toUpperCase() !== (look.accent ?? '').toUpperCase()) changes.accent = accent.toUpperCase()
  if (heading.trim() && heading.trim() !== look.heading_font) changes.heading_font = heading.trim()
  if (body.trim() && body.trim() !== look.body_font) changes.body_font = body.trim()
  if (tagline && tagline !== look.taglines[0]) changes.tagline = tagline
  const dirty = Object.keys(changes).length > 0
  const input =
    'w-full px-3 py-2 bg-primary border border-primary rounded-lg paragraph-sm text-primary focus:outline-none focus:border-brand-solid'
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ['Main colour', main, setMain],
            ['Accent colour', accent, setAccent],
          ] as const
        ).map(([label, v, set]) => (
          <label key={label} className="flex items-center gap-2 rounded-lg border border-secondary bg-secondary px-3 py-2">
            <input type="color" value={v} onChange={(e) => set(e.target.value)} className="w-8 h-8 rounded border-0 bg-transparent" />
            <span className="min-w-0">
              <span className="block paragraph-xs text-tertiary">{label}</span>
              <span className="block paragraph-sm text-primary font-mono">{v.toUpperCase()}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="paragraph-xs text-tertiary">Heading font</span>
          <input list="guide-fonts" value={heading} onChange={(e) => setHeading(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="paragraph-xs text-tertiary">Body font</span>
          <input list="guide-fonts" value={body} onChange={(e) => setBody(e.target.value)} className={input} />
        </label>
        <datalist id="guide-fonts">
          {[...ownFonts, ...FONT_SHELF.filter((f) => !ownFonts.includes(f))].map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </div>
      {look.taglines.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="paragraph-xs text-tertiary">Lead tagline</span>
          <input list="guide-taglines" value={tagline} onChange={(e) => setTagline(e.target.value)} className={input} />
          <datalist id="guide-taglines">
            {look.taglines.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
      )}
      <p className="paragraph-xs text-quaternary">Any Google font, or one you uploaded under Fonts.</p>
      <div className="flex items-center justify-between gap-2">
        {edited ? (
          <button type="button" onClick={onReset} disabled={saving} className="paragraph-xs text-tertiary hover:text-primary hover:underline underline-offset-2">
            Back to Mia's choices
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => onSave(changes)}
          disabled={!dirty || saving}
          className="px-3.5 py-1.5 rounded-lg bg-brand-solid text-primary-onbrand subheading-md shadow-sm hover:bg-brand-solid-hover disabled:opacity-50 active:scale-[0.98] transition"
        >
          {saving ? 'Redrawing…' : 'Save and redraw'}
        </button>
      </div>
    </div>
  )
}

interface GuideView {
  kind: 'pdf' | 'file' | 'fields' | 'none'
  pages: number
  file: string | null
  uploaded: string | null
  generated: boolean
  more?: boolean
  note?: string
}

const GROUPS: { title: string; sub: string; keys: (keyof BrandGuideExtracted)[] }[] = [
  {
    title: 'Who they are',
    sub: 'What they do, their story, what sets them apart',
    keys: ['product_name', 'one_liner', 'market', 'brand_story', 'key_differentiators', 'problems_solved', 'certifications'],
  },
  {
    title: 'How they sound',
    sub: 'Voice, tone, taglines and words to avoid',
    keys: ['brand_voice', 'tone_descriptors', 'humour', 'voice_do', 'voice_dont', 'never_use', 'taglines', 'customer_language'],
  },
  {
    title: 'Audience, market and goals',
    sub: 'Who it is for, competitors, goals, proof, picture style',
    keys: ['target_audience', 'competitors', 'primary_goals', 'proof_points', 'imagery_style'],
  },
]

/** The shared closed row (settings-ui), under this file's older prop names. */
const OpenRow = ({
  title,
  sub,
  children,
  defaultOpen = false,
}: {
  title: string
  sub: string
  children: ReactNode
  defaultOpen?: boolean
}) => (
  <Disclosure id={`brand:${title}`} title={title} meta={sub} defaultOpen={defaultOpen}>
    {children}
  </Disclosure>
)

/** Purple outline: the second most important action on the page (the first is solid purple). */
const ACCENT_OUTLINE =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg paragraph-sm font-medium border border-brand-solid text-brand-secondary hover:bg-brand-primary transition-colors disabled:opacity-50'
const ACCENT_SOLID =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg paragraph-sm font-medium bg-brand-solid text-primary-onbrand shadow-sm hover:bg-brand-solid-hover active:scale-[0.98] transition disabled:opacity-50'

const shown = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : typeof v === 'string' ? v : '')

/** Page pictures already fetched this session, by workspace, guide, version and page number. */
const PAGE_CACHE = new Map<string, string>()

/** The guide's pages, one at a time, with a strip of the rest. Fetched three at a time. */
const GuidePages = ({
  sessionId,
  tenantId,
  count,
  path = 'guide-page',
  version = '',
}: {
  sessionId: string
  tenantId: string
  count: number
  /** 'guide-page' (an uploaded PDF) or 'visual-guide/page' (the guide Mia drew) */
  path?: string
  /** changes when the guide is rebuilt, so new pages are fetched */
  version?: string
}) => {
  const key = (n: number) => `${tenantId}|${path}|${version}|${n}`
  const [urls, setUrls] = useState<(string | null)[]>(() =>
    Array.from({ length: count }, (_, i) => PAGE_CACHE.get(key(i + 1)) ?? null)
  )
  const [at, setAt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setUrls(Array.from({ length: count }, (_, i) => PAGE_CACHE.get(key(i + 1)) ?? null))
    const one = async (n: number) => {
      if (PAGE_CACHE.has(key(n))) return // drawn pages are kept for the session: back to the tab is instant
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          // ?v= per drawing: the browser kept the old picture after a redraw (19 Nov 2026)
          const res = await apiFetch(`/api/tenants/${tenantId}/brand-kit/${path}/${n}?v=${encodeURIComponent(version)}`, {
            headers: { 'X-Session-ID': sessionId },
          })
          if (!res.ok) throw new Error(String(res.status))
          const url = URL.createObjectURL(await res.blob())
          PAGE_CACHE.set(key(n), url)
          if (!cancelled) setUrls((u) => u.map((x, i) => (i === n - 1 ? url : x)))
          return
        } catch {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
        }
      }
    }
    ;(async () => {
      // Three at a time: the live database pool is small (18 Nov lesson).
      for (let n = 1; n <= count && !cancelled; n += 3) {
        await Promise.all([n, n + 1, n + 2].filter((k) => k <= count).map(one))
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key() is built from these
  }, [sessionId, tenantId, count, path, version])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return
      // Loops: right on the last page goes to the first (Josh, 19 Nov 2026).
      if (e.key === 'ArrowRight') setAt((a) => (a + 1) % count)
      if (e.key === 'ArrowLeft') setAt((a) => (a - 1 + count) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-lg bg-primary border border-tertiary overflow-hidden">
        {urls[at] ? (
          <img src={urls[at]!} alt={`Brand guide page ${at + 1}`} className="w-full h-auto block" />
        ) : (
          <div className="aspect-[16/9] flex items-center justify-center">
            <Spinner />
          </div>
        )}
        {count > 1 && (
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setAt((at - 1 + count) % count)}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-primary/90 border border-tertiary hidden sm:flex items-center justify-center shadow"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {count > 1 && (
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setAt((at + 1) % count)}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-primary/90 border border-tertiary hidden sm:flex items-center justify-center shadow"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Phone: the arrows sit here, beside the page count, not over the picture (20 Nov 2026). */}
        {count > 1 && (
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setAt((at - 1 + count) % count)}
            className="sm:hidden shrink-0 h-8 w-8 rounded-full border border-tertiary flex items-center justify-center"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <span className="paragraph-xs text-tertiary whitespace-nowrap">
          Page {at + 1} of {count}
        </span>
        {count > 1 && (
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setAt((at + 1) % count)}
            className="sm:hidden shrink-0 h-8 w-8 rounded-full border border-tertiary flex items-center justify-center"
          >
            <ChevronRight size={16} />
          </button>
        )}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {urls.map((u, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setAt(i)}
              aria-label={`Page ${i + 1}`}
              aria-current={i === at ? 'page' : undefined}
              className={`shrink-0 h-10 w-16 rounded border overflow-hidden bg-primary ${
                i === at ? 'border-brand-solid ring-2 ring-brand-solid/30' : 'border-tertiary opacity-70 hover:opacity-100'
              }`}
            >
              {u ? <img src={u} alt="" className="h-full w-full object-cover object-top" /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Last answers per workspace, so the tab paints at once on return and refreshes behind (19 Nov 2026). */
const VISUAL_CACHE = sessionCache<VisualGuide>('visual-guide') // survives a refresh in this tab
const VIEW_CACHE = sessionCache<GuideView>('guide-view') // survives a refresh in this tab
const KITINFO_CACHE = sessionCache<{ own_fonts?: OwnFont[]; font_status?: FontStatus[] }>('kit-info') // survives a refresh in this tab

export const AgencyBrandTab = ({ sessionId, tenantId, canManage }: Props) => {
  const mc = useMarketingContext(sessionId, tenantId)
  const { showToast } = useToast()
  const { context, loading, uploadStep, uploadResult, editedFields, isGenerating } = mc

  const [view, setView] = useState<GuideView | null>(() => VIEW_CACHE.get(tenantId) ?? null)
  const [viewLoading, setViewLoading] = useState(() => !VIEW_CACHE.has(tenantId))
  const [kit, setKit] = useState<{ own_fonts?: OwnFont[]; font_status?: FontStatus[] } | null>(
    () => KITINFO_CACHE.get(tenantId) ?? null
  )
  const [kitKey, setKitKey] = useState(0) // remounts the Brand Kit after the guide reader changes it
  const [editing, setEditing] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [showWebsite, setShowWebsite] = useState(false)
  const [readerOpen, setReaderOpen] = useState(false)
  const [readerFile, setReaderFile] = useState<File | null>(null)
  const [openingFile, setOpeningFile] = useState(false)
  const picked = useRef<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [visual, setVisual] = useState<VisualGuide | null>(() => VISUAL_CACHE.get(tenantId) ?? null)
  const [visualError, setVisualError] = useState<string | null>(null)
  const [drawVersion, setDrawVersion] = useState(0) // bumps after an edit redraws the pages
  const [editSaving, setEditSaving] = useState(false)
  const [applyingLook, setApplyingLook] = useState(false)

  const headers = { 'X-Session-ID': sessionId ?? '' }

  const loadView = useCallback(async () => {
    if (!sessionId) return
    setViewLoading(!VIEW_CACHE.has(tenantId))
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/brand-kit/guide-view`, { headers: { 'X-Session-ID': sessionId } })
      const v = res.ok ? ((await res.json()) as GuideView) : null
      if (v) VIEW_CACHE.set(tenantId, v)
      setView(v)
    } catch {
      setView(null)
    } finally {
      setViewLoading(false)
    }
  }, [sessionId, tenantId])

  const loadKit = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/brand-kit`, { headers: { 'X-Session-ID': sessionId } })
      if (res.ok) {
        const k = await res.json()
        KITINFO_CACHE.set(tenantId, k)
        setKit(k)
      }
    } catch {
      /* the kit section shows its own error */
    }
  }, [sessionId, tenantId])

  const loadVisual = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/brand-kit/visual-guide`, { headers: { 'X-Session-ID': sessionId } })
      if (res.ok) {
        const v = (await res.json()) as VisualGuide
        VISUAL_CACHE.set(tenantId, v)
        setVisual(v)
      }
    } catch {
      /* shows as no drawn guide */
    }
  }, [sessionId, tenantId])

  useEffect(() => {
    void loadView()
    void loadKit()
    void loadVisual()
  }, [loadView, loadKit, loadVisual])

  // While Mia draws the guide (about three minutes), check every five seconds.
  useEffect(() => {
    if (visual?.status !== 'building') return
    const t = window.setInterval(() => void loadVisual(), 5000)
    return () => window.clearInterval(t)
  }, [visual?.status, loadVisual])

  const startVisual = async (url?: string, fresh = false) => {
    if (!sessionId) return
    setVisualError(null)
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/brand-kit/visual-guide`, {
        method: 'POST',
        headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ website_url: url || null, fresh }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { detail?: string }).detail || 'Mia couldn’t start the guide.')
      }
      await loadVisual()
    } catch (e) {
      setVisualError(e instanceof Error ? e.message : 'Mia couldn’t start the guide.')
    }
  }

  const saveGuideEdits = async (body: Record<string, unknown>) => {
    if (!sessionId) return
    setEditSaving(true)
    setVisualError(null)
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/brand-kit/visual-guide/edits`, {
        method: 'PATCH',
        headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((j as { detail?: string }).detail || 'That change didn’t save.')
      setDrawVersion((v) => v + 1)
      showToast('success', 'Guide redrawn', 2500)
      setKitKey((k) => k + 1) // the kit follows a font/colour change (backend look.sync_edits)
      void loadKit()
      await loadVisual()
    } catch (e) {
      setVisualError(e instanceof Error ? e.message : 'That change didn’t save.')
    } finally {
      setEditSaving(false)
    }
  }

  const applyLook = async () => {
    if (!sessionId) return
    setApplyingLook(true)
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/brand-kit/visual-guide/apply-look`, {
        method: 'POST',
        headers: { 'X-Session-ID': sessionId },
      })
      if (!res.ok) throw new Error()
      setKitKey((k) => k + 1)
      void loadKit()
      showToast('success', 'Brand Kit updated', 2500)
    } catch {
      showToast('error', 'Couldn’t update the Brand Kit')
    } finally {
      setApplyingLook(false)
    }
  }

  const openVisualPdf = async () => {
    if (!sessionId) return
    setOpeningFile(true)
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/brand-kit/visual-guide/pdf`, { headers })
      if (!res.ok) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      /* nothing to open */
    } finally {
      setOpeningFile(false)
    }
  }

  // A saved upload: show its pages, and offer to read the colours and fonts out of it.
  const prevStep = useRef(uploadStep)
  useEffect(() => {
    if (prevStep.current === 'saving' && uploadStep === 'done') {
      void loadView()
      if (picked.current && /\.pdf$/i.test(picked.current.name) && canManage) {
        setReaderFile(picked.current)
        setReaderOpen(true)
      }
      picked.current = null
    }
    prevStep.current = uploadStep
  }, [uploadStep, loadView, canManage])

  const onFile = (file: File) => {
    picked.current = file
    void mc.handleFileSelect(file)
  }

  const openGuideFile = async (forReader: boolean) => {
    if (!sessionId) return
    setOpeningFile(true)
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/brand-kit/guide-file`, { headers })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      if (forReader) {
        setReaderFile(new File([blob], view?.file || 'brand-guide.pdf', { type: blob.type || 'application/pdf' }))
        setReaderOpen(true)
      } else {
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener')
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
    } catch {
      /* the button stays; nothing to show */
    } finally {
      setOpeningFile(false)
    }
  }

  const submitWebsite = async () => {
    const url = websiteUrl.trim()
    if (!url) return
    setShowWebsite(false)
    setWebsiteUrl('')
    // No uploaded guide: Mia also draws the guide from the site (logo, colours, fonts, photos),
    // in the background. With an uploaded PDF, the site only fills gaps in the fields.
    if (view?.kind !== 'pdf' && canManage) void startVisual(url)
    await mc.handleGenerateFromWebsite(url)
  }

  if (loading) {
    // The page's shape while it loads (first visit only; after that the cache shows at once).
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="h-5 w-32 rounded bg-secondary animate-pulse" />
        <div className="aspect-[16/9] w-full rounded-lg bg-secondary animate-pulse" />
        <div className="h-14 w-full rounded-xl bg-secondary animate-pulse" />
        <div className="h-14 w-full rounded-xl bg-secondary animate-pulse" />
      </div>
    )
  }

  // Reading an upload or a website, then the review before saving.
  if (uploadStep === 'uploading' || uploadStep === 'preview' || uploadStep === 'saving') {
    const keepsUpload = isGenerating && view?.kind === 'pdf'
    return (
      <div className="flex flex-col gap-4">
        <h2 className="heading-sm text-primary">Brand</h2>
        {uploadStep === 'uploading' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-secondary">
            <Spinner />
            <p className="paragraph-sm">
              {isGenerating
                ? 'Reading the website. This can take a minute…'
                : 'Reading the guide. Large files can take up to a minute…'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-tertiary bg-primary p-5">
            <p className="subheading-sm text-primary">
              {isGenerating
                ? `Read from ${uploadResult?.filename?.replace('[Generated from ', '').replace(']', '')}`
                : `Read from ${uploadResult?.filename}`}
            </p>
            <p className="paragraph-xs text-secondary mb-4">Check the fields and fix anything that's off, then save.</p>
            {keepsUpload ? (
              <p className="mb-4 rounded-lg bg-secondary border border-tertiary px-3 py-2 paragraph-xs text-secondary">
                The uploaded guide stays in use. What the website adds only fills fields the guide left empty.
              </p>
            ) : isGenerating && mc.generateHasExisting ? (
              <p className="mb-4 rounded-lg bg-warning-subtle border border-warning px-3 py-2 paragraph-xs text-warning-foreground">
                This replaces the current guide{mc.generateExistingFilename ? ` (${mc.generateExistingFilename})` : ''}.
              </p>
            ) : null}
            <ContextFieldsEditor
              fields={editedFields}
              onChange={mc.handleFieldChange}
              onSave={mc.handleSaveExtraction}
              onCancel={mc.handleCancelUpload}
              saving={uploadStep === 'saving'}
              saveLabel="Save"
            />
          </div>
        )}
      </div>
    )
  }

  const fields: Partial<BrandGuideExtracted> = {
    ...(context?.brand_guide_extracted ?? {}),
    ...(context?.manual_overrides ?? {}),
  }
  const hasGuide = !!context?.has_context
  // A website-drawn guide: its words and its drawing come from the same site, so one line says
  // where it came from, with the newest of the two dates (fresh-eyes pass, 20 Nov 2026).
  const drawnSameSite = !!view?.generated && !!visual?.pages
  const guideDate =
    drawnSameSite && visual?.built_at && (!view?.uploaded || visual.built_at > view.uploaded)
      ? visual.built_at
      : view?.uploaded ?? null
  const sourceLine = view?.file
    ? view.generated
      ? `Made by Mia ${view.file.replace('[Generated from ', 'from ').replace(']', '')}`
      : view.file
    : null

  return (
    <div className="flex flex-col gap-8">
      {/* 1. The guide */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] leading-6 font-semibold tracking-[-0.01em] text-primary">Brand guide</h2>
            <p className="paragraph-xs text-tertiary mt-0.5">
              {hasGuide
                ? `${sourceLine ?? 'Set by hand'}${guideDate ? ` · ${day(guideDate)}` : ''}`
                : 'Mia uses it in every chat and campaign.'}
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.pptx,.docx,.md,.markdown,.txt,.html,.htm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) onFile(f)
                }}
              />
              {/* No guide yet: the one thing to do pulses once (first-run hint, 19 Nov 2026). */}
              <button
                type="button"
                className={`${ACCENT_SOLID}${hasGuide ? '' : ' mia-nudge'}`}
                onClick={() => fileInput.current?.click()}
              >
                {hasGuide ? 'Upload new guide' : 'Upload guide'}
              </button>
              <button type="button" className={ACCENT_OUTLINE} onClick={() => setShowWebsite((v) => !v)}>
                {view?.kind === 'pdf' ? 'Fill gaps from website' : 'Build from website'}
              </button>
            </div>
          )}
        </div>

        {canManage && showWebsite && (
          <div className="flex items-center gap-2 rounded-lg border border-tertiary bg-secondary p-3">
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitWebsite()
              }}
              placeholder="https://www.clientwebsite.co.za"
              className="flex-1 rounded-lg border border-tertiary bg-primary px-3 py-1.5 paragraph-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-solid"
              autoFocus
            />
            <Button variant="primary" size="sm" onClick={() => void submitWebsite()} disabled={!websiteUrl.trim()}>
              Read it
            </Button>
          </div>
        )}

        {(visualError || (visual?.status !== 'building' && visual?.error)) && (
          <p className="paragraph-xs text-error">
            {visualError ?? `The last drawing didn't finish: ${String(visual?.error).slice(0, 160)}`}
          </p>
        )}

        {canManage && context?.brand_guide_pending && context?.brand_guide_chosen_by_owner && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tertiary bg-secondary px-4 py-3">
            <p className="paragraph-sm text-primary">Mia has a newer reading of the guide. Yours stays in use until you take hers.</p>
            <Button variant="secondary" size="sm" onClick={mc.handleUsePendingGuide}>
              Use Mia's version
            </Button>
          </div>
        )}

        {viewLoading ? (
          <div className="aspect-[16/9] rounded-lg border border-tertiary bg-secondary flex flex-col items-center justify-center gap-2">
            <Spinner />
            <p className="paragraph-xs text-tertiary">Opening the guide…</p>
          </div>
        ) : view?.kind === 'pdf' && view.pages > 0 && sessionId ? (
          <>
            <GuidePages sessionId={sessionId} tenantId={tenantId} count={view.pages} />
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => void openGuideFile(false)} disabled={openingFile}>
                Open the PDF
              </Button>
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => void openGuideFile(true)} disabled={openingFile}>
                  Read colours and fonts from it
                </Button>
              )}
              {view.more && <span className="paragraph-xs text-tertiary self-center">Showing the first 40 pages.</span>}
            </div>
          </>
        ) : view?.kind === 'file' ? (
          <div className="rounded-lg border border-tertiary bg-secondary p-4 flex flex-wrap items-center justify-between gap-2">
            <p className="paragraph-sm text-secondary">{view.note ?? `${view.file} is saved. Only PDFs show as pages here.`}</p>
            <Button variant="ghost" size="sm" onClick={() => void openGuideFile(false)} disabled={openingFile}>
              Open the file
            </Button>
          </div>
        ) : visual?.status === 'building' ? (
          <div className="aspect-[16/9] rounded-lg border border-tertiary bg-secondary flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Spinner />
            <p className="subheading-md text-primary">Mia is drawing the brand guide</p>
            <p className="paragraph-sm text-secondary">
              {visual.step ?? 'Starting'}… about three minutes. You can leave this page.
            </p>
          </div>
        ) : visual?.status === 'ready' && visual.pages > 0 && sessionId ? (
          <>
            <GuidePages
              sessionId={sessionId}
              tenantId={tenantId}
              count={visual.pages}
              path="visual-guide/page"
              version={`${visual.built_at ?? ''}-${drawVersion}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => void openVisualPdf()} disabled={openingFile}>
                Open the PDF
              </Button>
              {canManage && (
                <button type="button" className={ACCENT_OUTLINE} onClick={() => void applyLook()} disabled={applyingLook}>
                  {applyingLook ? 'Updating…' : 'Use this look in the Brand Kit'}
                </button>
              )}
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => void startVisual(visual.website ?? undefined)}>
                  Build again
                </Button>
              )}
              {!drawnSameSite && (
                <span className="paragraph-xs text-quaternary">
                  Drawn by Mia from {(visual.website ?? 'their website').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  {visual.built_at ? ` · ${day(visual.built_at)}` : ''}
                </span>
              )}
            </div>
            {canManage && visual.look && (
              <Card>
                <OpenRow title="Adjust the guide" sub="Colours, fonts and tagline">
                  <GuideEditor
                    look={visual.look}
                    ownFonts={(kit?.own_fonts ?? []).map((f) => f.family)}
                    edited={!!visual.edits && Object.keys(visual.edits).length > 0}
                    saving={editSaving}
                    onSave={(c) => void saveGuideEdits(c)}
                    onReset={() => void saveGuideEdits({ reset: true })}
                  />
                </OpenRow>
              </Card>
            )}
          </>
        ) : hasGuide && view?.kind === 'fields' && !view.generated ? (
          <div className="rounded-lg border border-tertiary bg-secondary p-4">
            <p className="paragraph-sm text-secondary">
              Mia has this guide's words and fields, but not the file itself: it was uploaded before Mia kept guide files.
              {canManage ? ' Upload it again to see its pages here and read its colours and fonts.' : ''}
            </p>
          </div>
        ) : hasGuide && view?.generated && canManage ? (
          <div className="rounded-xl border border-dashed border-tertiary bg-secondary p-6 text-center">
            <p className="subheading-md text-primary">Mia can draw this as a proper guide</p>
            <p className="paragraph-sm text-secondary mt-1 max-w-md mx-auto">
              Logo, colours with their jobs, fonts, photos and voice on a few pages, from their website first and their
              social pages after. About three minutes.
            </p>
            <div className="mt-3">
              <Button variant="primary" size="sm" onClick={() => setShowWebsite(true)}>
                Draw it from the website
              </Button>
            </div>
          </div>
        ) : !hasGuide ? (
          <div className="rounded-xl border border-dashed border-tertiary bg-secondary p-6 text-center">
            <p className="subheading-md text-primary">Best: upload the client's brand guide</p>
            <p className="paragraph-sm text-secondary mt-1 max-w-md mx-auto">
              A PDF shows here page by page, and Mia takes its logo, colours, fonts and voice from it. No guide? Build
              one from their website.
            </p>
          </div>
        ) : null}
      </div>

      {/* 2. The look */}
      <div className="flex flex-col gap-3 pt-2">
      <div className="px-0.5">
        <h2 className="text-[15px] leading-6 font-semibold tracking-[-0.01em] text-primary">Brand Kit</h2>
        <p className="paragraph-xs text-tertiary mt-0.5">What every picture and studio job uses.</p>
      </div>
      <Card>
        <OpenRow title="Logo, colours and fonts" sub="Edit any of them" defaultOpen>
          <BrandKitTab
            key={kitKey}
            sessionId={sessionId}
            tenantId={tenantId}
            canManage={canManage}
            compact
            fontsSlot={
              sessionId ? (
                <BrandFontsRow
                  sessionId={sessionId}
                  tenantId={tenantId}
                  canManage={canManage}
                  ownFonts={kit?.own_fonts ?? []}
                  status={kit?.font_status ?? []}
                  onChanged={(got) => {
                    setKit(got as typeof kit)
                    setKitKey((k) => k + 1)
                  }}
                />
              ) : null
            }
          />
        </OpenRow>
      </Card>
      </div>

      {/* 3. What Mia knows */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[15px] leading-6 font-semibold tracking-[-0.01em] text-primary">What Mia knows</h2>
          {canManage && hasGuide && !editing && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={mc.handleFindCompetitors} disabled={mc.competitorSearching}>
                {mc.competitorSearching ? <Spinner size="sm" /> : 'Find competitors'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="rounded-xl border border-tertiary bg-primary p-5">
            <ContextFieldsEditor
              fields={fields}
              onChange={mc.handleFieldChange}
              onSave={async () => {
                await mc.handleSaveOverrides()
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
              saveLabel="Save changes"
            />
          </div>
        ) : (
          <Card>
            {GROUPS.map((g) => {
              const filled = g.keys.filter((k) => shown(fields[k]))
              return (
                <OpenRow
                  key={g.title}
                  title={g.title}
                  sub={filled.length ? g.sub : `Empty · ${g.sub}`}
                >
                  {filled.length ? (
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {filled.map((k) => (
                        <div key={k}>
                          <dt className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">{FIELD_LABELS[k]}</dt>
                          <dd className="paragraph-sm text-primary mt-0.5 whitespace-pre-line">{shown(fields[k])}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="paragraph-sm text-tertiary">Nothing yet.</p>
                  )}
                </OpenRow>
              )
            })}
            <OpenRow title="Facts Mia can state" sub="Awards, dates, prices to confirm">
              <BrandFactsCard sessionId={sessionId} tenantId={tenantId} canManage={canManage} />
            </OpenRow>
            {/* Performance baselines: refreshed weekly on their own since 19 Nov (services/baseline_refresh.py), off the page. */}
          </Card>
        )}
      </div>

      <BrandGuideModal
        isOpen={readerOpen}
        onClose={() => {
          setReaderOpen(false)
          setReaderFile(null)
        }}
        sessionId={sessionId}
        tenantId={tenantId}
        file={readerFile}
        onApplied={() => {
          setKitKey((k) => k + 1)
          void loadKit()
        }}
      />
    </div>
  )
}
