import { StepNumber } from './badges'
import { InlineMd } from './inline-md'
import type { StructuredGoldReport } from './types'

interface ExecSummaryProps {
  summary: StructuredGoldReport['executive_summary']
}

// The design gives this card a purple-tinted border (40% purple), unlike the
// hairline on every other card.
export const ExecSummary = ({ summary }: ExecSummaryProps) => (
  <div
    className="gr-card py-6 px-5 sm:px-[26px]"
    style={{ borderColor: 'var(--gr-purple-border)' }}
  >
    <p className="text-[15px] leading-[22px]" style={{ color: 'var(--gr-heading)' }}>
      <InlineMd text={summary.narrative} chips={summary.highlighted_campaigns} />
    </p>

    {summary.next_steps.length > 0 && (
      <div className="mt-5 pt-[18px] border-t" style={{ borderColor: 'var(--gr-line)' }}>
        <p className="gr-eyebrow mb-3">Immediate next steps our team will take</p>
        <ol className="space-y-3">
          {summary.next_steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <StepNumber n={i + 1} />
              <span
                className="text-[13px] leading-[19px] pt-0.5"
                style={{ color: 'var(--gr-heading)' }}
              >
                <InlineMd text={step} />
              </span>
            </li>
          ))}
        </ol>
      </div>
    )}
  </div>
)
