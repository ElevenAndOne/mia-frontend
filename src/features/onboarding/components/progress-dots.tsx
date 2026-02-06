interface ProgressDotsProps {
  current: number
  total: number
}

export const ProgressDots = ({ current, total }: ProgressDotsProps) => (
  <div className="flex gap-1">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`w-2 h-2 rounded-full transition-colors ${i < current ? 'bg-brand-solid' : 'bg-tertiary'}`}
      />
    ))}
  </div>
)


interface SegmentedCircularProgressProps {
  current: number
  total: number
  size?: number
  strokeWidth?: number
  segmentRatio?: number
}

export const SegmentedCircularProgress = ({ current, total, size = 56, strokeWidth = 9, segmentRatio = 0.6 }: SegmentedCircularProgressProps) => {
  const safeTotal = Math.max(total, 1)
  const safeCurrent = Math.min(Math.max(current, 0), safeTotal)
  const viewBoxSize = 100
  const radius = (viewBoxSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const slotLength = circumference / safeTotal
  const safeSegmentRatio = Math.min(Math.max(segmentRatio, 0.2), 0.9)
  const segmentLength = slotLength * safeSegmentRatio
  const centerOffset = segmentLength / 2
  const activeIndex = Math.max(safeCurrent - 1, 0)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} aria-labelledby="progress-title" role="img">
        <title id="progress-title">Progress: {safeCurrent}/{safeTotal}</title>
        <g transform="rotate(-90 50 50)">
          {Array.from({ length: safeTotal }, (_, index) => (
            <circle
              key={index}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-index * slotLength + centerOffset}
              className={activeIndex >= index ? 'text-foreground-brand-primary' : 'text-background-quaternary'}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
