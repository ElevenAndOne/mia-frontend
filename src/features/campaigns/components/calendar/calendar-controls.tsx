import { softColor } from '../../utils/channel-colors'

interface ChannelChip { channel: string; label: string; color: string }

interface Props {
  channels: ChannelChip[]
  active: Set<string>
  monthCounts: Record<string, number>
  onToggle: (channel: string) => void
  monthLabel: string
  monthPostCount: number
  onPrev: () => void
  onNext: () => void
  prevDisabled: boolean
  nextDisabled: boolean
}

export const CalendarControls = ({
  channels, active, monthCounts, onToggle, monthLabel, monthPostCount, onPrev, onNext, prevDisabled, nextDisabled,
}: Props) => (
  <div className="flex items-center justify-between gap-5 flex-wrap">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="label-xs text-quaternary uppercase tracking-[0.13em] mr-1">Channels</span>
      {channels.map((c) => {
        const on = active.has(c.channel)
        return (
          <button
            key={c.channel}
            onClick={() => onToggle(c.channel)}
            className="inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border transition-all"
            style={{
              borderColor: on ? softColor(c.color, 50) : 'var(--color-border-secondary)',
              background: on ? softColor(c.color, 14) : 'var(--color-background-secondary)',
              opacity: on ? 1 : 0.55,
            }}
          >
            <span className="w-2 h-2 rounded-sm" style={{ background: on ? c.color : 'transparent', border: `1.5px solid ${c.color}` }} />
            <span className="paragraph-xs font-medium" style={{ color: on ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{c.label}</span>
            <span className="cw-mono text-[10.5px] font-semibold rounded-full px-1.5" style={{ color: on ? c.color : 'var(--color-text-quaternary)', background: on ? softColor(c.color, 16) : 'var(--color-background-tertiary)' }}>{monthCounts[c.channel] ?? 0}</span>
          </button>
        )
      })}
    </div>

    <div className="flex items-center gap-2.5">
      <button onClick={onPrev} disabled={prevDisabled} className="w-8 h-8 rounded-lg border border-secondary flex items-center justify-center text-tertiary hover:bg-secondary disabled:opacity-35">‹</button>
      <div className="min-w-[150px] text-center">
        <div className="title-h6 text-primary">{monthLabel}</div>
        <div className="paragraph-xs text-quaternary">{monthPostCount} posts scheduled</div>
      </div>
      <button onClick={onNext} disabled={nextDisabled} className="w-8 h-8 rounded-lg border border-secondary flex items-center justify-center text-tertiary hover:bg-secondary disabled:opacity-35">›</button>
    </div>
  </div>
)
