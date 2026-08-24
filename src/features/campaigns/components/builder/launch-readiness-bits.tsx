// Shared presentation for the readiness panel and its channel cards: the state
// pill, the timestamp format, and the "N of M passing" arithmetic.

export const fmtWhen = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export const Pill = ({
  tone,
  children,
}: {
  tone: 'good' | 'bad' | 'warn' | 'mute'
  children: React.ReactNode
}) => (
  <span
    className={`label-xs px-2.5 py-1 rounded-full whitespace-nowrap ${
      {
        good: 'bg-utility-success-100 text-utility-success-700',
        bad: 'bg-utility-error-100 text-utility-error-700',
        warn: 'bg-utility-warning-100 text-utility-warning-700',
        mute: 'bg-tertiary text-quaternary',
      }[tone]
    }`}
  >
    {children}
  </span>
)

// "N of M passing". M counts every check that gave a verdict — notes are excluded,
// because they describe what the push will do rather than judging it, and counting
// them would quietly inflate the score.
export const score = (s: {
  passed_count: number
  blocking_count: number
  warning_count: number
  waived_count: number
  unknown_count: number
}) => ({
  passed: s.passed_count,
  total:
    s.passed_count + s.blocking_count + s.warning_count + s.waived_count + s.unknown_count,
})

