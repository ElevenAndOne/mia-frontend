import { softColor } from '../../utils/channel-colors'
import type { DayCell } from '../../utils/calendar-data'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const weekdayShort = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })

const EventChip = ({
  name,
  color,
  channelLabel,
  type,
}: {
  name: string
  color: string
  channelLabel: string
  type?: string | null
}) => (
  <div
    className="flex items-center gap-1.5 rounded-md px-1.5 py-1"
    style={{ background: softColor(color, 13), border: `1px solid ${softColor(color, 38)}` }}
  >
    <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: color }} />
    <span className="paragraph-xs text-secondary truncate">{name}</span>
    <span className="paragraph-xs text-quaternary truncate ml-auto pl-1.5 hidden sm:inline">
      {channelLabel}
      {type ? ` · ${type}` : ''}
    </span>
  </div>
)

export const CalendarGrid = ({ cells }: { cells: DayCell[] }) => {
  const scheduled = cells.filter((c) => c.inMonth && c.events.length > 0)

  return (
    <div className="bg-secondary-alt border border-secondary rounded-2xl p-4 md:p-5">
      {/* Mobile: agenda list — a 7-col grid is unusable at phone width */}
      <div className="md:hidden flex flex-col gap-2">
        {scheduled.length === 0 ? (
          <div className="py-10 text-center paragraph-sm text-quaternary">
            No posts scheduled this month
          </div>
        ) : (
          scheduled.map((cell) => (
            <div
              key={cell.iso}
              className="rounded-xl border p-3"
              style={{
                background: cell.isToday
                  ? softColor('#8b6dff', 9)
                  : 'var(--color-background-secondary)',
                borderColor: cell.isToday
                  ? softColor('#8b6dff', 65)
                  : 'var(--color-border-tertiary)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="cw-mono text-sm font-semibold"
                  style={{ color: cell.isToday ? 'var(--cw-accent)' : 'var(--color-text-primary)' }}
                >
                  {weekdayShort(cell.iso)} {cell.day}
                </span>
                {cell.isToday && (
                  <span className="text-[8.5px] font-bold tracking-[0.08em] text-white bg-brand-solid rounded-full px-1.5 py-0.5">
                    TODAY
                  </span>
                )}
                <span className="paragraph-xs text-quaternary ml-auto">
                  {cell.events.length + cell.moreCount} post
                  {cell.events.length + cell.moreCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {cell.events.map((e, i) => (
                  <EventChip
                    key={i}
                    name={e.name}
                    color={e.color}
                    channelLabel={e.channelLabel}
                    type={e.type}
                  />
                ))}
                {cell.moreCount > 0 && (
                  <span className="paragraph-xs text-quaternary pl-1">+{cell.moreCount} more</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: month grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-2 mb-2.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="label-xs text-quaternary uppercase tracking-[0.12em] pl-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell) => (
            <div
              key={cell.iso}
              className="relative min-h-[112px] rounded-xl border p-2 flex flex-col"
              style={{
                opacity: cell.inMonth ? 1 : 0.32,
                background: cell.isToday
                  ? softColor('#8b6dff', 9)
                  : cell.inMonth
                    ? cell.weekend
                      ? 'var(--color-background-secondary-subtle)'
                      : 'var(--color-background-secondary)'
                    : 'var(--color-background-secondary-subtle)',
                borderColor: cell.isToday ? softColor('#8b6dff', 65) : 'var(--color-border-tertiary)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="cw-mono text-[13px]"
                  style={{
                    color: cell.isToday
                      ? 'var(--cw-accent)'
                      : cell.inMonth
                        ? 'var(--color-text-secondary)'
                        : 'var(--color-text-quaternary)',
                    fontWeight: cell.isToday ? 700 : 500,
                  }}
                >
                  {cell.day}
                </span>
                {cell.isToday && (
                  <span className="text-[8.5px] font-bold tracking-[0.08em] text-white bg-brand-solid rounded-full px-1.5 py-0.5">
                    TODAY
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {cell.events.map((e, i) => (
                  <div
                    key={i}
                    className="group relative flex items-center gap-1.5 rounded-md px-1.5 py-1"
                    style={{ background: softColor(e.color, 13), border: `1px solid ${softColor(e.color, 38)}` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: e.color }} />
                    <span className="paragraph-xs text-secondary truncate">{e.name}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-tertiary border border-secondary rounded-lg px-2.5 py-1.5 shadow-lg z-20 pointer-events-none">
                      <span className="block text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: e.color }}>
                        {e.channelLabel}
                        {e.type ? ` · ${e.type}` : ''}
                      </span>
                      <span className="block paragraph-xs font-semibold text-primary mt-0.5">{e.name}</span>
                    </span>
                  </div>
                ))}
                {cell.moreCount > 0 && (
                  <span className="paragraph-xs text-quaternary pl-1">+{cell.moreCount} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}