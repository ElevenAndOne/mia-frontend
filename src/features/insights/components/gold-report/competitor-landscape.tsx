import { useState } from 'react'
import type { GoldCompetitorBrand, GoldCompetitorFinding, GoldCompetitorLandscape } from './types'

// What the report read off competitors' own websites — taglines, claims and the hero
// image each one leads with — plus any change a competitor made between snapshots
// (the pipeline's competitor_findings). Two honesty rules carried from the report:
// the caveat about where these names came from is shown whenever the report makes
// one, and nothing here is presented as advertising — it is website messaging.

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
const HeroThumb = ({ url, name }: { url: string; name: string }) => {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className="shrink-0">
      <img
        src={url}
        alt={`${name} hero image`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-16 h-16 rounded-[0.5rem] object-cover border"
        style={{ borderColor: 'var(--gr-line)' }}
      />
    </a>
  )
}

const BrandRow = ({ brand }: { brand: GoldCompetitorBrand }) => {
  const lines = [
    ...brand.taglines.map((t) => ({ text: t, kind: 'tagline' as const })),
    ...brand.claims.map((t) => ({ text: t, kind: 'claim' as const })),
  ]
  return (
    <div className="px-4 sm:px-5 py-3.5 flex gap-3.5">
      {brand.hero_image_url && <HeroThumb url={brand.hero_image_url} name={brand.name} />}
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
  if (brands.length === 0 && changes.length === 0) return null
  return (
    <div className="gr-card overflow-hidden">
      {landscape?.caveat && (
        <p
          className="px-4 sm:px-5 py-2.5 text-[0.75rem] leading-[1.125rem] border-b"
          style={{ borderColor: 'var(--gr-line)', color: 'var(--gr-muted)' }}
        >
          {landscape.caveat}
        </p>
      )}
      {brands.map((brand, i) => (
        <div
          key={`${brand.name}-${i}`}
          className={i > 0 || landscape?.caveat ? 'border-t' : ''}
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
