import { InlineMd } from './inline-md'

// The report's actions as a plain checklist — the second thing a reader should
// see, after the numbers. Uses the digest's short lines, not the longer
// executive-summary phrasing.
export const DoNext = ({ steps }: { steps: string[] }) => (
  <div className="gr-card overflow-hidden">
    {steps.map((step, i) => (
      <div
        key={i}
        className="flex items-start gap-3 px-4 sm:px-5 py-3.5 border-t first:border-t-0"
        style={{ borderColor: 'var(--gr-line)' }}
      >
        <span
          className="shrink-0 w-[15px] h-[15px] mt-[3px] rounded"
          style={{ border: '1.6px solid var(--gr-purple)' }}
        />
        <p className="text-[14px] leading-[21px]" style={{ color: 'var(--gr-body)' }}>
          <InlineMd text={step} />
        </p>
      </div>
    ))}
  </div>
)
