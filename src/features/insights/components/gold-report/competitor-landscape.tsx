import { useState } from 'react'
import type {
  GoldCompetitorAdPlatform,
  GoldCompetitorAds,
  GoldCompetitorBrand,
  GoldCompetitorFinding,
  GoldCompetitorLandscape,
} from './types'

// What the report read off competitors' own websites — taglines, claims and the hero
// images they lead with — their ads from the ad libraries, and any change a competitor
// made between snapshots (the pipeline's competitor_findings). Honesty rules carried
// from the report: the caveat about where these names came from is shown whenever the
// report makes one; website messaging and ads stay visibly separate; competitors whose
// site could not be read are named rather than silently missing; and when the client's
// own site shows no shop, that is said before anyone reads competitors' terms as theirs.
// Taglines, claims and ad copy are quoted (their words are on the page or in the ad);
// `terms` — offer, delivery and price facts the pipeline extracted — are not.

const hostname = (url: string): string => {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const CHANGE_LABELS: Record<string, string> = {
  offer_changed: 'Offer changed',
  positioning_changed: 'Positioning changed',
  price_changed: 'Price changed',
  tagline_changed: 'Tagline changed',
  new_competitor: 'New competitor',
}

const changeLabel = (kind: string) =>
  CHANGE_LABELS[kind] ?? kind.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** Remote image on someone else's CDN: it can 404, hotlink-block, or be http on an
 *  https page. Any of those simply removes the thumbnail — the brand still reads. */
const HeroThumb = ({ url, name, alt }: { url: string; name: string; alt?: string | null }) => {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className="shrink-0">
      <img
        src={url}
        alt={alt || `${name} hero image`}
        title={alt || undefined}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-16 h-16 rounded-[0.5rem] object-cover border"
        style={{ borderColor: 'var(--gr-line)' }}
      />
    </a>
  )
}

const SmallLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    className="text-[0.6875rem] font-semibold tracking-[0.06em] uppercase"
    style={{ color: 'var(--gr-muted)' }}
  >
    {children}
  </p>
)

/** "Google: none found", "Meta: not checked: their website links no Facebook page",
 *  "Meta: 30 found, 23 live" — so "no ads" never implies a platform that was not searched. */
const platformResult = (p: GoldCompetitorAdPlatform): string => {
  if (p.status === 'ok') {
    if (typeof p.total !== 'number') return 'ads found'
    return `${p.total} found${typeof p.live === 'number' && p.live > 0 ? `, ${p.live} live` : ''}`
  }
  return p.note ?? (p.status === 'no_ads' ? 'none found' : 'not checked')
}

const PlatformChecks = ({ platforms }: { platforms: GoldCompetitorAdPlatform[] }) => (
  <ul className="text-[0.75rem] leading-[1.125rem]" style={{ color: 'var(--gr-muted)' }}>
    {platforms.map((p) => (
      <li key={p.platform}>
        <span style={{ color: 'var(--gr-body)' }}>{p.platform}</span>: {platformResult(p)}
      </li>
    ))}
  </ul>
)

/** False exactly when AdsBlock renders nothing, so a caller can drop its own label too. */
const adsHaveSomethingToSay = (ads: GoldCompetitorAds): boolean =>
  ads.status === 'ok' || ads.status === 'no_ads' || (ads.platforms?.length ?? 0) > 0

const AdsBlock = ({ ads }: { ads: GoldCompetitorAds }) => {
  const platforms = ads.platforms ?? []
  if (ads.status !== 'ok') {
    if (platforms.length === 0 && ads.status !== 'no_ads') return null
    return (
      <div className="space-y-0.5">
        <SmallLabel>Ads</SmallLabel>
        {platforms.length > 0 ? (
          <PlatformChecks platforms={platforms} />
        ) : (
          // Blocks built before per-platform results: say only what is known.
          ads.status === 'no_ads' && (
            <p className="text-[0.75rem] leading-[1.125rem]" style={{ color: 'var(--gr-muted)' }}>
              No ads found.
            </p>
          )
        )}
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      <SmallLabel>
        Ads · {ads.total} found{ads.live > 0 && `, ${ads.live} live`}
      </SmallLabel>
      {platforms.length > 0 && <PlatformChecks platforms={platforms} />}
      <ul className="space-y-1.5">
        {ads.items.map((ad, i) => {
          const meta = [
            ad.platform,
            ad.format,
            typeof ad.days_shown === 'number' ? `running ${ad.days_shown} days` : null,
            ad.live ? 'live' : 'not live',
          ].filter(Boolean)
          return (
            <li key={i} className="text-[0.8125rem] leading-[1.1875rem]">
              {ad.headline && <span style={{ color: 'var(--gr-heading)' }}>&ldquo;{ad.headline}&rdquo;</span>}
              {ad.description && (
                <span style={{ color: 'var(--gr-muted)' }}>
                  {ad.headline ? ' — ' : ''}&ldquo;{ad.description}&rdquo;
                </span>
              )}
              <span className="block text-[0.6875rem] leading-4" style={{ color: 'var(--gr-muted)' }}>
                {meta.join(' · ')}
                {ad.link && (
                  <>
                    {' · '}
                    <a
                      href={ad.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline underline-offset-2"
                    >
                      View in ad library
                    </a>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const BrandRow = ({ brand }: { brand: GoldCompetitorBrand }) => {
  const lines = [
    ...brand.taglines.map((t) => ({ text: t, kind: 'tagline' as const })),
    ...brand.claims.map((t) => ({ text: t, kind: 'claim' as const })),
  ]
  // Older blocks carry only the first hero image.
  const heroes =
    brand.hero_images ?? (brand.hero_image_url ? [{ url: brand.hero_image_url, alt: null }] : [])
  return (
    <div className="px-4 sm:px-5 py-3.5">
      <div className="min-w-0 space-y-1.5">
        <p className="text-[0.8438rem] leading-5">
          <span className="font-semibold" style={{ color: 'var(--gr-heading)' }}>
            {brand.name}
          </span>
          {brand.source_url && (
            <>
              {' '}
              <a
                href={brand.source_url.startsWith('http') ? brand.source_url : `https://${brand.source_url}`}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2"
                style={{ color: 'var(--gr-muted)' }}
              >
                {hostname(brand.source_url)}
              </a>
            </>
          )}
        </p>
        {lines.length > 0 && (
          <ul className="space-y-1">
            {lines.map((line, i) => (
              <li
                key={i}
                className="text-[0.8125rem] leading-[1.1875rem]"
                style={{ color: line.kind === 'tagline' ? 'var(--gr-heading)' : 'var(--gr-muted)' }}
              >
                &ldquo;{line.text}&rdquo;
              </li>
            ))}
          </ul>
        )}
        {(brand.terms?.length ?? 0) > 0 && (
          <ul className="space-y-1">
            {brand.terms!.map((term, i) => (
              <li
                key={i}
                className="text-[0.8125rem] leading-[1.1875rem]"
                style={{ color: 'var(--gr-muted)' }}
              >
                {term}
              </li>
            ))}
          </ul>
        )}
        {heroes.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {heroes.map((h) => (
              <HeroThumb key={h.url} url={h.url} name={brand.name} alt={h.alt} />
            ))}
          </div>
        )}
        {brand.promotion && (
          <p className="text-[0.75rem] leading-[1.125rem]" style={{ color: 'var(--gr-muted)' }}>
            New promotion on their site: &ldquo;{brand.promotion.title}&rdquo;
            {brand.promotion.uploaded && ` (${brand.promotion.uploaded})`}
            {brand.promotion.url && (
              <>
                {' · '}
                <a
                  href={brand.promotion.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-2"
                >
                  See the image
                </a>
              </>
            )}
          </p>
        )}
        {brand.ads && <AdsBlock ads={brand.ads} />}
        {brand.note && (
          <p
            className="text-[0.75rem] leading-[1.125rem]"
            style={{ color: 'var(--gr-muted)' }}
          >
            {brand.note}
          </p>
        )}
      </div>
    </div>
  )
}

export const CompetitorLandscape = ({
  landscape,
  changes = [],
}: {
  landscape?: GoldCompetitorLandscape | null
  changes?: GoldCompetitorFinding[]
}) => {
  const brands = landscape?.brands ?? []
  const unreadable = landscape?.unreadable ?? []
  if (brands.length === 0 && changes.length === 0) return null
  const ownSite = landscape?.client_site
  const hasHeader = Boolean(landscape?.caveat || ownSite)
  return (
    <div className="gr-card overflow-hidden">
      {hasHeader && (
        <div
          className="px-4 sm:px-5 py-2.5 space-y-1 text-[0.75rem] leading-[1.125rem]"
          style={{ color: 'var(--gr-muted)' }}
        >
          {ownSite && (
            <p style={{ color: 'var(--gr-heading)' }}>
              Your own website{ownSite.website ? ` (${hostname(ownSite.website)})` : ''} shows no
              shop or delivery terms, so every term below is a competitor&rsquo;s, not yours.
            </p>
          )}
          {landscape?.caveat && <p>{landscape.caveat}</p>}
        </div>
      )}
      {brands.map((brand, i) => (
        <div
          key={`${brand.name}-${i}`}
          className={i > 0 || hasHeader ? 'border-t' : ''}
          style={{ borderColor: 'var(--gr-line)' }}
        >
          <BrandRow brand={brand} />
        </div>
      ))}
      {changes.length > 0 && (
        <div className="px-4 sm:px-5 py-3.5 border-t" style={{ borderColor: 'var(--gr-line)' }}>
          <p
            className="text-[0.6875rem] font-semibold tracking-[0.06em] uppercase mb-1.5"
            style={{ color: 'var(--gr-muted)' }}
          >
            Changed since the last check
          </p>
          <ul className="space-y-1">
            {changes.map((c, i) => (
              <li key={i} className="text-[0.8125rem] leading-[1.1875rem]">
                <span className="font-semibold" style={{ color: 'var(--gr-heading)' }}>
                  {c.competitor}
                </span>
                <span style={{ color: 'var(--gr-muted)' }}>
                  {' '}
                  — {changeLabel(c.change_type)}: {c.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {unreadable.length > 0 && (
        <div
          className="px-4 sm:px-5 py-2.5 space-y-2.5 border-t"
          style={{ borderColor: 'var(--gr-line)' }}
        >
          <p className="text-[0.75rem] leading-[1.125rem]" style={{ color: 'var(--gr-muted)' }}>
            Not covered: {unreadable.map((u) => u.name).join(', ')}.{' '}
            {unreadable.length === 1 ? 'Its website' : 'Their websites'} could not be read, so this
            picture is incomplete.
          </p>
          {/* Their sites were not read, but the ad libraries were still searched: show what
              that search found, labelled so nothing here reads as coming from their site. */}
          {unreadable
            .filter((u) => u.ads && adsHaveSomethingToSay(u.ads))
            .map((u, i) => (
              <div key={`${u.name}-${i}`} className="space-y-1">
                <p className="text-[0.75rem] leading-[1.125rem]" style={{ color: 'var(--gr-muted)' }}>
                  <span className="font-semibold" style={{ color: 'var(--gr-heading)' }}>
                    {u.name}
                  </span>{' '}
                  — from the ad libraries only, not their website:
                </p>
                <AdsBlock ads={u.ads!} />
              </div>
            ))}
        </div>
      )}
      {landscape?.territory_summary && (
        <p
          className="px-4 sm:px-5 py-3 text-[0.8125rem] leading-[1.1875rem] border-t"
          style={{ borderColor: 'var(--gr-line)', color: 'var(--gr-muted)' }}
        >
          {landscape.territory_summary}
        </p>
      )}
    </div>
  )
}
