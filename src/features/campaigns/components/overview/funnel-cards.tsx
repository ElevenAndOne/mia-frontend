import { softColor } from '../../utils/channel-colors'
import type { FunnelPhase } from '../../utils/overview-data'

interface Props {
  phases: FunnelPhase[]
  selectedId: string | null
  onSelect: (phaseId: string) => void
}

// The customer-journey funnel. Each card = a phase; clicking one filters the
// timeline below to that phase's channels.
export const FunnelCards = ({ phases, selectedId, onSelect }: Props) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
    {phases.map((p) => {
      const active = p.phaseId === selectedId
      return (
        <button
          key={p.phaseId}
          onClick={() => onSelect(p.phaseId)}
          className="text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
          style={{
            background: active ? softColor(p.hue, 16) : 'var(--color-background-secondary)',
            borderColor: active ? p.hue : 'var(--color-border-secondary)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="cw-mono text-[11px] font-semibold" style={{ color: p.hue }}>{p.num}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md" style={{ color: p.hue, background: softColor(p.hue, 16) }}>{p.role}</span>
          </div>
          <div className="title-h6 text-primary mt-2.5">{p.name}</div>
          <div className="paragraph-xs text-tertiary leading-snug mt-1 min-h-[36px] line-clamp-3">{p.objective}</div>

          <div className="mt-3.5 pt-3.5 border-t border-tertiary">
            {p.primaryValue ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold cw-mono tracking-tight text-primary">{p.primaryValue}</span>
                <span className="paragraph-xs text-tertiary">{p.primaryLabel}</span>
              </div>
            ) : (
              <div className="paragraph-xs text-quaternary">No KPI target yet</div>
            )}
            {p.secondary && <div className="paragraph-xs text-quaternary mt-0.5">{p.secondary}</div>}
          </div>

          {p.channels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3.5">
              {p.channels.map((c) => (
                <span key={c.name} className="inline-flex items-center gap-1.5 paragraph-xs text-secondary bg-primary border border-secondary rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />{c.label}
                </span>
              ))}
            </div>
          )}
        </button>
      )
    })}
  </div>
)
