interface SectionHeaderProps {
  index: string
  eyebrow: string
  title: string
  note?: string
  /** The exec-summary headline is regular weight in the design; the rest are bold. */
  titleWeight?: 'normal' | 'bold'
}

// "02 · INSIGHTS" eyebrow + editorial title, with an optional right-aligned note.
export const SectionHeader = ({
  index,
  eyebrow,
  title,
  note,
  titleWeight = 'bold',
}: SectionHeaderProps) => (
  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 mb-3.5">
    <div className="space-y-0.5">
      <p className="gr-eyebrow">
        {index} · {eyebrow}
      </p>
      <h2
        className={`text-lg leading-[27px] ${titleWeight === 'bold' ? 'font-bold' : 'font-normal'}`}
        style={{ color: 'var(--gr-heading)' }}
      >
        {title}
      </h2>
    </div>
    {note && (
      <p className="text-[13px] leading-5" style={{ color: 'var(--gr-muted)' }}>
        {note}
      </p>
    )}
  </div>
)
