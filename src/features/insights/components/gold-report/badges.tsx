// Badge colouring shared by insight rows and recommendation cards.
//
// Accent hexes come from the Figma "Category Pill" component set (six named
// variants). Pills are a 14%-alpha tint of the accent with full-strength text
// and dot, no border. Two badge kinds, per the designer's notes:
//  - Rank badge ("PERFORMANCE DRIVER 1") — position-derived, colour cycles by
//    rank ("we can assign different colours to 1, 2, 3, 4").
//  - Category badge ("STRUCTURAL LEVER") — keyword-mapped to the component
//    set's variant colours, neutral fallback for unseen labels.

const ACCENTS = {
  structural: '#7c6cf0',
  volume: '#5b9dee',
  learning: '#3ddc97',
  scheduling: '#3fc7d6',
  creative: '#e876b0',
  efficiency: '#f0a63e',
} as const

type Accent = keyof typeof ACCENTS

// Ordered — first match wins, so put narrower patterns first.
const CATEGORY_ACCENTS: [RegExp, Accent][] = [
  [/CREATIVE|OVERRIDE|FORMAT|ASSET/, 'creative'],
  [/COST|EFFICIENCY|SPEND|BUDGET|CPC|CPM/, 'efficiency'],
  [/LEARNING|MATURITY|PROTECT/, 'learning'],
  [/TIMING|SCHEDUL|DAY|SEASON/, 'scheduling'],
  [/STRUCTURAL|CHANNEL|LEVER/, 'structural'],
  [/VOLUME|SCALE|REACH|AUDIENCE|SOURCE|PLATFORM/, 'volume'],
] as const

const RANK_CYCLE: Accent[] = [
  'structural',
  'volume',
  'learning',
  'scheduling',
  'creative',
  'efficiency',
]

const categoryHex = (label: string): string | null => {
  const upper = label.toUpperCase()
  const match = CATEGORY_ACCENTS.find(([re]) => re.test(upper))
  return match ? ACCENTS[match[1]] : null
}

export const Badge = ({ label, hex }: { label: string; hex?: string }) => {
  const accent = hex ?? categoryHex(label)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full py-1 pl-[7px] pr-[9px] text-[11px] font-bold tracking-[0.04em] uppercase whitespace-nowrap"
      style={
        accent
          ? { color: accent, backgroundColor: `${accent}24` }
          : { color: 'var(--gr-muted)', backgroundColor: 'var(--gr-surface-2)' }
      }
    >
      <span className="w-1.5 h-1.5 rounded-[3px] bg-current shrink-0" />
      {label}
    </span>
  )
}

/** Position-derived "PERFORMANCE DRIVER n" badge — stable regardless of model wording. */
export const RankBadge = ({ rank }: { rank: number }) => (
  <Badge
    label={`Performance Driver ${rank}`}
    hex={ACCENTS[RANK_CYCLE[(rank - 1) % RANK_CYCLE.length]]}
  />
)

/** Step number chip for the executive-summary next steps — all purple, per the design. */
export const StepNumber = ({ n }: { n: number }) => (
  <span
    className="shrink-0 w-5 h-5 mt-0.5 rounded-full flex items-center justify-center text-[11px] font-semibold"
    style={{
      fontFamily: 'var(--gr-mono)',
      color: 'var(--gr-purple-text)',
      backgroundColor: 'var(--gr-purple-tint)',
      border: '1px solid var(--gr-purple-border)',
    }}
  >
    {n}
  </span>
)
