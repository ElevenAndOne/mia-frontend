import { softColor } from '../../utils/channel-colors'
import type { TimelineData } from '../../utils/overview-data'

const LEGEND = [
  { label: 'Carousel', color: '#8b6dff' },
  { label: 'Animation', color: '#4f8cff' },
  { label: 'Static', color: '#f0a82e' },
  { label: 'Email', color: '#2bd4a4' },
]
const LABEL_W = 152

interface Props {
  timeline: TimelineData
  selectedChannels: Set<string> | null
}

export const CampaignTimeline = ({ timeline, selectedChannels }: Props) => {
  const dim = (channel: string) => selectedChannels != null && !selectedChannels.has(channel)

  return (
    <div className="bg-secondary-alt border border-secondary rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="label-xs text-quaternary uppercase tracking-[0.14em]">Campaign Timeline</span>
        <div className="flex gap-3.5">
          {LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 paragraph-xs text-tertiary">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />{l.label}
            </span>
          ))}
        </div>
      </div>

      {!timeline.hasRange ? (
        <p className="paragraph-sm text-quaternary text-center py-8">Add flight or launch dates in the Builder to see the timeline.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* month axis */}
            <div className="flex items-center">
              <div style={{ width: LABEL_W }} className="flex-none" />
              <div className="flex-1 relative h-4">
                {timeline.months.map((m, i) => (
                  <div key={i} className="absolute text-center paragraph-xs text-tertiary uppercase tracking-wide" style={{ left: `${m.left}%`, width: `${m.width}%` }}>{m.label}</div>
                ))}
              </div>
            </div>

            {/* lanes + gridlines */}
            <div className="relative mt-1.5">
              <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: LABEL_W, right: 0 }}>
                {timeline.gridlines.map((g, i) => (
                  <div key={i} className="absolute top-0 bottom-0 w-px bg-tertiary" style={{ left: `${g}%` }} />
                ))}
              </div>

              {timeline.lanes.map((lane) => (
                <div key={lane.channel} className="flex items-center h-12 border-t border-tertiary transition-opacity" style={{ opacity: dim(lane.channel) ? 0.28 : 1 }}>
                  <div style={{ width: LABEL_W }} className="flex-none flex items-center gap-2 pr-3.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: lane.color }} />
                    <span className="paragraph-sm font-medium text-secondary truncate">{lane.label}</span>
                  </div>
                  <div className="flex-1 relative h-12">
                    {lane.flight && (
                      <div className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md border" style={{ left: `${lane.flight.left}%`, width: `${lane.flight.width}%`, background: softColor(lane.color, 12), borderColor: softColor(lane.color, 55) }} />
                    )}
                    {lane.dots.map((d, i) => (
                      <div key={i} className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center" style={{ left: `${d.left}%` }}>
                        <span className="w-3 h-3 rounded-full transition-transform group-hover:scale-150" style={{ background: d.color, border: '2.5px solid var(--color-background-secondary)', boxShadow: `0 0 0 1px ${d.color}` }} />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-tertiary border border-secondary rounded-lg px-2.5 py-1.5 shadow-lg z-20 pointer-events-none">
                          <span className="paragraph-xs font-semibold text-primary">{d.name}</span>
                          <span className="paragraph-xs text-quaternary cw-mono ml-1.5">{d.dateLabel}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
