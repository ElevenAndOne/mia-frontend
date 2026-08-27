import type { MemoRecommendation } from '../types'
import { PLATFORM_LABEL, evidenceSummary } from '../utils/memo-format'

interface MemoRecDetailsProps {
  rec: MemoRecommendation
}

/** The numbers behind a recommendation — collapsed by default, because the
 *  decision rarely needs them and the card must stay readable at a glance. */
export const MemoRecDetails = ({ rec }: MemoRecDetailsProps) => {
  const evidence = evidenceSummary(rec.evidence)
  const reasons = rec.evidence?.reasons ?? []
  const issues = rec.evidence?.issues ?? []
  const campaigns = rec.evidence?.campaigns ?? []
  const plan = rec.campaign_ref?.plan

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-secondary">
      {evidence && <p className="paragraph-xs text-tertiary">{evidence}</p>}
      {reasons.map((reason) => (
        <p key={reason} className="paragraph-xs text-tertiary">
          {reason}
        </p>
      ))}
      {issues.map((issue) => (
        <p key={issue} className="paragraph-xs text-tertiary">
          — {issue}
        </p>
      ))}
      {campaigns.length > 1 && (
        <div className="flex flex-col gap-1">
          <p className="paragraph-xs text-quaternary">Campaigns in this finding</p>
          {campaigns.map((c) => (
            <p key={c.id ?? c.name} className="paragraph-xs text-tertiary">
              — {c.name}
              {c.plan ? ` · ${c.plan}` : ''}
            </p>
          ))}
        </div>
      )}
      {rec.evidence?.organic && rec.evidence.permalink && (
        <a
          href={rec.evidence.permalink}
          target="_blank"
          rel="noreferrer"
          className="paragraph-xs text-brand underline"
        >
          Open the post
        </a>
      )}
      <p className="paragraph-xs text-quaternary">
        {plan
          ? `Part of ${plan}`
          : rec.evidence?.basis !== 'plan' && !rec.evidence?.organic
            ? 'Not part of any campaign plan'
            : ''}
        {rec.platform ? ` · ${PLATFORM_LABEL[rec.platform] ?? rec.platform}` : ''}
      </p>
    </div>
  )
}
