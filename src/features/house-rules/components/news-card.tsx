import { useState } from 'react'
import { Button } from '../../../components/button'
import type { NewsCard as Card, NewsDecision } from '../types'
import { day, safeLink } from './format'

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  google: 'Google Ads',
  youtube: 'YouTube',
  search: 'Google Search',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  other: 'Other',
}

interface NewsCardProps {
  card: Card
  busy: boolean
  onDecide: (decision: NewsDecision, ruleText?: string) => void
}

/** One "What's changing" card: what happened, why it matters, what to do, and the source. Keep, ignore, or turn it
 *  into a platform fact Mia follows. */
export function NewsCard({ card, busy, onDecide }: NewsCardProps) {
  const [ruling, setRuling] = useState(false)
  const [rule, setRule] = useState(card.rule_text ?? '')
  const link = safeLink(card.source_url)
  const when = day(card.published_at ?? card.found_at)
  const trend = card.kind === 'trend'

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 label-xs ${
            trend ? 'bg-utility-brand-100 text-utility-brand-700' : 'bg-secondary text-secondary'
          }`}
        >
          {trend ? 'Our clients' : (PLATFORM_LABEL[card.platform ?? 'other'] ?? card.platform)}
        </span>
        {card.importance === 'high' && (
          <span className="rounded-full bg-utility-warning-100 px-2.5 py-0.5 label-xs text-utility-warning-700">
            Important
          </span>
        )}
        <span className="paragraph-sm text-tertiary">
          {[trend ? null : card.source_name, when].filter(Boolean).join(' · ')}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 title-h6 text-primary break-words">{card.headline ?? card.title}</h3>
        {card.summary && <p className="m-0 paragraph-md text-secondary">{card.summary}</p>}
        {card.why && (
          <p className="m-0 paragraph-md text-secondary">
            <span className="subheading-md text-primary">Why it matters: </span>
            {card.why}
          </p>
        )}
        {card.action && (
          <p className="m-0 paragraph-md text-secondary">
            <span className="subheading-md text-primary">What to do: </span>
            {card.action}
          </p>
        )}
        {link && !trend && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="paragraph-sm text-tertiary underline hover:text-secondary w-fit"
          >
            Read the source
          </a>
        )}
      </div>

      {card.status === 'made_rule' ? (
        <span className="paragraph-sm text-utility-success-700">
          Now a platform fact Mia follows{card.decided_by ? `, made by ${card.decided_by}` : ''}.
        </span>
      ) : ruling ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (rule.trim()) onDecide('make_rule', rule.trim())
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="label-sm text-secondary">
              The rule, as one instruction Mia should follow from now on. It goes live straight away.
            </span>
            <textarea
              autoFocus
              rows={2}
              value={rule}
              maxLength={2000}
              onChange={(e) => setRule(e.target.value)}
              placeholder="For example: Demand Gen campaigns set Display at ad group level, not campaign level."
              className="w-full resize-y rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-md text-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={busy || !rule.trim()}>
              Make it a rule
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRuling(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {card.status !== 'kept' && (
            <Button variant={card.status === 'new' ? 'primary' : 'secondary'} disabled={busy} onClick={() => onDecide('keep')}>
              {card.status === 'ignored' ? 'Keep after all' : 'Keep'}
            </Button>
          )}
          {card.status !== 'ignored' && (
            <Button variant="secondary" disabled={busy} onClick={() => onDecide('ignore')}>
              Ignore
            </Button>
          )}
          {!trend && (
            <Button variant="ghost" disabled={busy} onClick={() => setRuling(true)}>
              Make it a rule
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
