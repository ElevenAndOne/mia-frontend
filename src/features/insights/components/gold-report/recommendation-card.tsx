import { Badge } from './badges'
import { InlineMd } from './inline-md'
import type { GoldRecommendation } from './types'

export const RecommendationCard = ({ rec }: { rec: GoldRecommendation }) => (
  <div className="gr-card py-5 px-5 sm:px-[22px] flex flex-col">
    <div className="flex items-center gap-2.5 mb-3">
      <span
        className="text-xs font-bold"
        style={{ fontFamily: 'var(--gr-mono)', color: 'var(--gr-muted)' }}
      >
        {rec.id}
      </span>
      <Badge label={rec.tag} />
    </div>
    <h3 className="text-[15px] leading-5 font-bold mb-1.5" style={{ color: 'var(--gr-heading)' }}>
      {rec.title}
    </h3>
    <p className="text-[13.3px] leading-5 flex-1" style={{ color: 'var(--gr-body)' }}>
      <InlineMd text={rec.body} />
    </p>
    <div className="gr-predict mt-4 flex items-start gap-[9px] py-2.5 px-3">
      <svg
        viewBox="0 0 12 12"
        fill="none"
        className="w-3 h-3 mt-px shrink-0"
        style={{ color: 'var(--gr-green)' }}
        aria-hidden="true"
      >
        <path
          d="M1 8.5L4.5 5L7 7.5L11 3.5M11 3.5H7.5M11 3.5V7"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="space-y-0.5">
        <p
          className="text-[10.5px] font-bold tracking-[0.05em] uppercase"
          style={{ color: 'var(--gr-green)' }}
        >
          Prediction
        </p>
        <p className="text-[12.3px] leading-[18px]" style={{ color: 'var(--gr-heading)' }}>
          {rec.prediction}
        </p>
      </div>
    </div>
  </div>
)
