import { useEffect, useState } from 'react'
import { Spinner } from '../../../components/spinner'
import { fetchMarketingContext } from '../../marketing-context/services/marketing-context-service'
import type { WebsiteFacts } from '../../marketing-context/types'

interface Props {
  sessionId: string
  tenantId: string
}

const Block = ({ title, items }: { title: string; items: string[] }) =>
  items.length ? (
    <div>
      <p className="paragraph-xs text-quaternary mb-1">{title}</p>
      <ul className="paragraph-sm text-primary space-y-0.5">
        {items.map((t) => (
          <li key={t} className="leading-snug">
            {t}
          </li>
        ))}
      </ul>
    </div>
  ) : null

/**
 * Brand → "Facts Mia may quote": the prices, awards, dates and links Mia read off the website.
 * Read-only for now — these are the only facts she will state in a post, so the owner can see
 * exactly what she knows. Re-reading the site under Workspace refreshes them.
 */
export const BrandFactsSection = ({ sessionId, tenantId }: Props) => {
  const [facts, setFacts] = useState<WebsiteFacts | null>(null)
  const [loading, setLoading] = useState(true)
  // Computed when the facts arrive (not during render — the lint forbids Date.now() there).
  const [upcoming, setUpcoming] = useState<NonNullable<WebsiteFacts['events']>>([])

  useEffect(() => {
    let cancelled = false
    fetchMarketingContext(sessionId, tenantId)
      .then((ctx) => {
        if (cancelled) return
        const f = ctx?.website_facts ?? null
        setFacts(f)
        const cutoff = Date.now() - 86_400_000
        setUpcoming((f?.events ?? []).filter((e) => e.date && new Date(e.date).getTime() >= cutoff))
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, tenantId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Spinner size="sm" variant="dark" />
        <p className="paragraph-xs text-quaternary">Loading…</p>
      </div>
    )
  }
  if (!facts) {
    return (
      <p className="paragraph-sm text-quaternary py-2">
        Nothing yet. Read your website under Workspace and Mia will note your prices, awards, events
        and links here.
      </p>
    )
  }

  const regular = (facts.events ?? []).filter((e) => !e.date && (e.date_text || e.name))
  const links = Object.entries(facts.links ?? {}).filter(([, v]) => !!v) as Array<[string, string]>

  return (
    <div className="pt-1 space-y-4">
      {facts.what_they_do && <p className="paragraph-sm text-primary">{facts.what_they_do}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <Block
          title="Offers & prices"
          items={(facts.offers ?? []).map(
            (o) => `${o.name}${o.price ? ` — ${o.price}${o.unit ? ` ${o.unit}` : ''}` : ''}`
          )}
        />
        <Block title="Awards & rankings" items={facts.awards ?? []} />
        <Block title="History" items={facts.history ?? []} />
        <Block
          title="Coming up"
          items={[
            ...upcoming.map((e) => `${e.name} — ${e.date}`),
            ...regular.map((e) => `${e.name}${e.date_text ? ` — ${e.date_text}` : ''}`),
          ]}
        />
        <Block title="Latest news" items={(facts.news ?? []).map((n) => n.title)} />
        <Block
          title="Links Mia uses in posts"
          items={links.map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)}: ${v}`)}
        />
      </div>
      <p className="paragraph-xs text-quaternary">
        Mia only states what is listed here. To update it, use Read again under Workspace.
        {facts.read_at
          ? ` Last read ${new Date(facts.read_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}.`
          : ''}
      </p>
    </div>
  )
}
