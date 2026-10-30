import { Suspense, lazy, useEffect, useState, type DragEvent, type ReactNode } from 'react'
import { Check } from '../../../components/icon/check'
import { ChevronDown } from '../../../components/icon/chevron-down'
import { File06 } from '../../../components/icon/file-06'
import { Globe01 } from '../../../components/icon/globe-01'
import { Plus } from '../../../components/icon/plus'
import { Spinner } from '../../../components/spinner'
import { useToast } from '../../../contexts/toast-context'
import { apiFetch } from '../../../utils/api'
import { HowMiaWritesCard, LearnedRulesCard, PeopleCard } from './basic-brand-cards'
import { BrandFactsSection } from './brand-facts-section'
import { BrandGuideModal } from './brand-guide-modal'
import { WebsiteReadCard } from './website-read-card'

const BrandKitTab = lazy(() => import('./brand-kit-tab').then((m) => ({ default: m.BrandKitTab })))

interface Colour {
  name?: string
  hex: string
}

interface Guide {
  file: { name: string; pages?: number; url?: string }
  applied: boolean
  strapline?: string | null
  fonts?: {
    headline_font?: string
    headline_weight?: string
    headline_drawn_as?: string | null
    body_font?: string
    body_weight?: string
    body_drawn_as?: string | null
  } | null
  service_colours?: { service: string; hex: string }[]
}

interface Kit {
  font_family: string | null
  palette: Colour[]
  logo: { cdn_url: string } | null
  guide: Guide | null
  facebook_page?: string | null
}

// Faces every device has: no Google Fonts request for these, only for the rest.
const SYSTEM_FONTS = new Set(['arial', 'helvetica', 'times new roman', 'georgia', 'verdana'])

const loadFont = (family: string | null | undefined) => {
  const f = (family ?? '').trim()
  if (!f || SYSTEM_FONTS.has(f.toLowerCase())) return
  const id = `gf-${f.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@300;400;700&display=swap`
  document.head.appendChild(link)
}

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="settings-eyebrow text-quaternary px-1 pb-2">{children}</p>
)

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section
    className={`settings-card rounded-xl border border-tertiary bg-secondary overflow-hidden divide-y divide-tertiary ${className}`}
  >
    {children}
  </section>
)

const ghost =
  'px-3 py-1.5 border border-primary rounded-full paragraph-xs text-secondary hover:bg-tertiary transition-colors disabled:opacity-50'

/** A row that opens what's behind it in place: title, one line, chevron. */
const OpenRow = ({ title, sub, children }: { title: string; sub: string; children: ReactNode }) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-tertiary/40 transition-colors"
      >
        <span className="min-w-0 flex-1">
          <span className="block subheading-md text-primary">{title}</span>
          <span className="block paragraph-xs text-quaternary truncate">{sub}</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-quaternary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// The last kit seen per workspace, so coming back to the tab shows it at once and refreshes
// quietly underneath instead of a spinner each time.
const kitCache = new Map<string, Kit>()

/**
 * Basic's Brand tab (Settings clean-up, 30 Oct 2026): what their posts look like first, where
 * Mia learns it (their brand guide, website and Page) next, then how she writes for them.
 * A brand guide is one row here, or a file dropped anywhere on the tab.
 */
export const BasicBrandTab = ({
  sessionId,
  tenantId,
  canManage,
  workspaceName,
  workspaceLogoUrl,
  websiteUrl,
  onWebsiteSaved,
  connectedPlatforms,
  onOpenConnections,
  onLookChanged,
}: {
  sessionId: string
  tenantId: string
  canManage: boolean
  workspaceName: string
  workspaceLogoUrl: string | null
  websiteUrl: string
  onWebsiteSaved: (url: string) => void
  connectedPlatforms: string[]
  onOpenConnections: () => void
  /** A website read or a guide changed the look (and maybe the logo): the page refreshes it. */
  onLookChanged?: () => void
}) => {
  const { showToast } = useToast()
  const [kit, setKit] = useState<Kit | null>(() => kitCache.get(tenantId) ?? null)
  const [loading, setLoading] = useState(() => !kitCache.has(tenantId))
  const [editing, setEditing] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [dropped, setDropped] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)

  const load = async () => {
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/brand-kit`, {
        headers: { 'X-Session-ID': sessionId },
      })
      if (res.ok) {
        const got = (await res.json()) as Kit
        kitCache.set(tenantId, got)
        setKit(got)
      }
    } finally {
      setLoading(false)
    }
  }

  // Again when the logo changes on the Workspace tab: it's the same one logo.
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, workspaceLogoUrl])

  const guide = kit?.guide ?? null
  const headFont = kit?.font_family ?? null
  const bodyFont = guide?.fonts?.body_font ?? null
  // What the preview draws: a paid face shows in its open match (Gotham → Montserrat).
  const headDraw = guide?.fonts?.headline_drawn_as ?? headFont
  const bodyDraw = guide?.fonts?.body_drawn_as ?? bodyFont
  useEffect(() => {
    loadFont(headDraw)
    loadFont(bodyDraw)
  }, [headDraw, bodyDraw])

  const openGuide = (file: File | null) => {
    setDropped(file)
    setGuideOpen(true)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!canManage) return
    const f = e.dataTransfer.files?.[0]
    if (f) openGuide(f)
  }

  const palette = (kit?.palette ?? []).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c.hex))
  const logo = kit?.logo?.cdn_url ?? workspaceLogoUrl
  const fb = connectedPlatforms.filter((p) => /facebook|instagram/i.test(p)).length

  return (
    <div
      className={`relative space-y-5 ${dragging ? 'ring-2 ring-brand-solid/40 rounded-xl' : ''}`}
      onDragOver={(e) => {
        if (!canManage) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {/* Your look: what posts come out looking like */}
      <div>
        <Eyebrow>Your look</Eyebrow>
        <Card>
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size="md" variant="dark" />
            </div>
          ) : (
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-24 h-11 rounded-lg bg-primary border border-tertiary flex items-center justify-center overflow-hidden shrink-0">
                    {logo ? (
                      <img
                        src={logo}
                        alt=""
                        className="max-w-full max-h-full object-contain p-1.5"
                      />
                    ) : (
                      <span className="paragraph-xs text-quaternary">No logo</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="subheading-md text-primary truncate">{workspaceName}</p>
                    {guide?.strapline && (
                      <p className="paragraph-xs text-quaternary truncate">{guide.strapline}</p>
                    )}
                  </div>
                </div>
                {guide?.applied && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-utility-success-50 text-utility-success-700 paragraph-xs font-medium">
                    <Check size={12} />
                    From your brand guide
                  </span>
                )}
              </div>

              {palette.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {palette.slice(0, 7).map((c, i) => (
                    <div key={`${c.hex}-${i}`} className="text-center">
                      <span
                        className={`block h-11 rounded-lg border border-black/10 ${i === 0 ? 'w-16' : 'w-11'}`}
                        style={{ background: c.hex }}
                        title={c.hex}
                      />
                      <span className="block mt-1 paragraph-xs text-quaternary max-w-[5.5rem] leading-tight">
                        {(c.name || '').replace(/\s*\(.*\)$/, '') || c.hex}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="paragraph-sm text-quaternary">
                  No brand colours yet. Mia picks them up from your website or brand guide.
                </p>
              )}

              <div className="flex items-end gap-6 flex-wrap border-t border-tertiary pt-4">
                <div>
                  <p
                    className="text-[1.75rem] leading-none text-primary"
                    style={{
                      fontFamily: `'${headDraw ?? 'inherit'}', sans-serif`,
                      fontWeight: 700,
                    }}
                  >
                    Aa
                  </p>
                  <p className="paragraph-xs text-quaternary mt-1">
                    Headlines:{' '}
                    {headFont
                      ? `${headFont} ${guide?.fonts?.headline_weight ?? ''}`.trim()
                      : 'Mia picks'}
                  </p>
                </div>
                {bodyFont && (
                  <div>
                    <p
                      className="text-[1.75rem] leading-none text-primary"
                      style={{ fontFamily: `'${bodyDraw}', sans-serif`, fontWeight: 300 }}
                    >
                      Aa
                    </p>
                    <p className="paragraph-xs text-quaternary mt-1">
                      Body: {`${bodyFont} ${guide?.fonts?.body_weight ?? ''}`.trim()}
                    </p>
                  </div>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editing) void load()
                      setEditing((v) => !v)
                    }}
                    className={`${ghost} ml-auto`}
                  >
                    {editing ? 'Done' : 'Edit'}
                  </button>
                )}
              </div>

              {guide?.applied && (guide.service_colours?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {guide.service_colours!.map((s) => (
                    <span
                      key={s.service}
                      className="inline-flex items-center gap-1.5 paragraph-xs text-quaternary"
                    >
                      <span className="w-3 h-3 rounded-sm" style={{ background: s.hex }} />
                      {s.service}
                    </span>
                  ))}
                </div>
              )}

              {editing && (
                <div className="border-t border-tertiary pt-4">
                  <Suspense
                    fallback={
                      <div className="flex justify-center py-6">
                        <Spinner size="md" variant="dark" />
                      </div>
                    }
                  >
                    <BrandKitTab
                      sessionId={sessionId}
                      tenantId={tenantId}
                      canManage={canManage}
                      hideLogo
                    />
                  </Suspense>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Where Mia learns about you: guide, website, Page */}
      <div>
        <Eyebrow>Where Mia learns about you</Eyebrow>
        <Card>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                guide
                  ? 'bg-tertiary text-secondary'
                  : 'bg-utility-success-50 text-utility-success-700'
              }`}
            >
              {guide ? <File06 size={18} /> : <Plus size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="subheading-md text-primary">
                {guide ? 'Brand guide' : 'Got a brand guide?'}
              </p>
              <p className="paragraph-xs text-quaternary truncate">
                {guide
                  ? `${guide.file.name}${guide.file.pages ? `, ${guide.file.pages} pages` : ''}. ${
                      guide.applied
                        ? 'Your colours, fonts and logo rules come from here first.'
                        : "Read, but you haven't chosen what to use yet."
                    }`
                  : 'Add the PDF and your posts use your exact colours, fonts and logo rules.'}
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => openGuide(null)}
                className={
                  guide
                    ? ghost
                    : 'px-3.5 py-1.5 rounded-full bg-brand-solid text-primary-onbrand paragraph-xs font-medium'
                }
              >
                {guide ? 'Replace' : 'Add PDF'}
              </button>
            )}
          </div>
          <WebsiteReadCard
            sessionId={sessionId}
            tenantId={tenantId}
            websiteUrl={websiteUrl}
            canManage={canManage}
            onWebsiteSaved={(url) => {
              onWebsiteSaved(url)
              void load() // a logo or colours the site gave show in Your look
              onLookChanged?.()
            }}
            compact
          />
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="w-8 h-8 rounded-lg bg-tertiary flex items-center justify-center shrink-0 text-secondary">
              <Globe01 size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="subheading-md text-primary">Facebook and Instagram</p>
              <p className="paragraph-xs text-quaternary truncate">
                {fb
                  ? `${kit?.facebook_page ? `${kit.facebook_page}. ` : ''}What your customers react to`
                  : 'Not connected yet'}
              </p>
            </div>
            <button type="button" onClick={onOpenConnections} className={ghost}>
              {fb ? 'Manage' : 'Connect'}
            </button>
          </div>
        </Card>
      </div>

      {/* How Mia writes for you */}
      <div>
        <Eyebrow>How Mia writes for you</Eyebrow>
        <Card>
          <OpenRow
            title="What you do, who it's for, how you sound"
            sub="And words or things to avoid"
          >
            <HowMiaWritesCard sessionId={sessionId} tenantId={tenantId} canManage={canManage} />
          </OpenRow>
          <OpenRow title="People" sub="Who Mia can put in your pictures">
            <PeopleCard sessionId={sessionId} tenantId={tenantId} canManage={canManage} />
          </OpenRow>
          <OpenRow title="What Mia has learned" sub="Habits from your changes, turn any off">
            <LearnedRulesCard sessionId={sessionId} tenantId={tenantId} canManage={canManage} />
          </OpenRow>
          <OpenRow
            title="Facts Mia may quote"
            sub="Prices and offers she found, and where each came from"
          >
            <BrandFactsSection sessionId={sessionId} tenantId={tenantId} />
          </OpenRow>
        </Card>
      </div>

      <BrandGuideModal
        isOpen={guideOpen}
        onClose={() => {
          setGuideOpen(false)
          setDropped(null)
        }}
        sessionId={sessionId}
        tenantId={tenantId}
        file={dropped}
        onApplied={() => {
          void load()
          onLookChanged?.()
          showToast('success', 'Saved. Your next posts use your brand guide.')
        }}
      />
    </div>
  )
}
