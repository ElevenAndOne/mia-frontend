import { SegmentedCircularProgress } from './progress-dots'

interface ChatHeaderProps {
  current: number
  total: number
  title: string
  onSkip: () => void
}

export const ChatHeader = ({ current, total, title, onSkip }: ChatHeaderProps) => (
  <div className="sticky top-0 w-full p-3 gap-3 border-b border-secondary">

    <div className='w-full max-w-3xl mx-auto flex items-center justify-between'>
      <div className="flex items-center gap-3 bg-secondary px-3 py-2 rounded-xl w-full">
        <SegmentedCircularProgress current={current} total={total} size={32} />
        <h1 className="label-sm">{title}</h1>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="px-3 py-2 rounded-full subheading-md text-tertiary hover:text-secondary hover:bg-tertiary transition-colors"
        title="Skip onboarding"
        aria-label="Skip onboarding"
      >
        Skip
      </button>
    </div>
  </div>
)
