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
