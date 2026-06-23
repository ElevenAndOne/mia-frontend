interface StatusBadgeProps {
  status: string
  pulse?: boolean
}

const CONFIG: Record<string, { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-utility-success-100 text-utility-success-700 border-utility-success-200' },
  draft: { label: 'Draft', className: 'bg-tertiary text-tertiary border-secondary' },
  paused: { label: 'Paused', className: 'bg-utility-warning-100 text-utility-warning-700 border-utility-warning-200' },
  completed: { label: 'Completed', className: 'bg-utility-info-100 text-utility-info-700 border-utility-info-200' },
}

export const StatusBadge = ({ status, pulse }: StatusBadgeProps) => {
  const cfg = CONFIG[status] ?? CONFIG.draft
  const dot = status === 'live'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full label-xs border ${cfg.className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-utility-success-700 ${pulse ? 'animate-pulse' : ''}`} />}
      {cfg.label}
    </span>
  )
}
