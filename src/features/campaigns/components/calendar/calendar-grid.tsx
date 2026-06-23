import { softColor } from '../../utils/channel-colors'
import type { DayCell } from '../../utils/calendar-data'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const CalendarGrid = ({ cells }: { cells: DayCell[] }) => (
  <div className="bg-secondary-alt border border-secondary rounded-2xl p-4 md:p-5">
    <div className="grid grid-cols-7 gap-2 mb-2.5">
      {WEEKDAYS.map((w) => (
        <div key={w} className="label-xs text-quaternary uppercase tracking-[0.12em] pl-1">{w}</div>
      ))}
    </div>
    <div className="grid grid-cols-7 gap-2">
      {cells.map((cell) => (
        <div
          key={cell.iso}
          className="relative min-h-[112px] rounded-xl border p-2 flex flex-col"
          style={{
            opacity: cell.inMonth ? 1 : 0.32,
            background: cell.isToday ? softColor('#8b6dff', 9) : cell.inMonth ? (cell.weekend ? 'var(--color-background-secondary-subtle)' : 'var(--color-background-secondary)') : 'var(--color-background-secondary-subtle)',
            borderColor: cell.isToday ? softColor('#8b6dff', 65) : 'var(--color-border-tertiary)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="cw-mono text-[13px]" style={{ color: cell.isToday ? 'var(--cw-accent)' : cell.inMonth ? 'var(--color-text-secondary)' : 'var(--color-text-quaternary)', fontWeight: cell.isToday ? 700 : 500 }}>{cell.day}</span>
            {cell.isToday && <span className="text-[8.5px] font-bold tracking-[0.08em] text-white bg-brand-solid rounded-full px-1.5 py-0.5">TODAY</span>}
          </div>
          <div className="flex flex-col gap-1">
            {cell.events.map((e, i) => (
              <div key={i} className="group relative flex items-center gap-1.5 rounded-md px-1.5 py-1" style={{ background: softColor(e.color, 13), border: `1px solid ${softColor(e.color, 38)}` }}>
                <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: e.color }} />
                <span className="paragraph-xs text-secondary truncate">{e.name}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-tertiary border border-secondary rounded-lg px-2.5 py-1.5 shadow-lg z-20 pointer-events-none">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: e.color }}>{e.channelLabel}{e.type ? ` · ${e.type}` : ''}</span>
                  <span className="block paragraph-xs font-semibold text-primary mt-0.5">{e.name}</span>
                </span>
              </div>
            ))}
            {cell.moreCount > 0 && <span className="paragraph-xs text-quaternary pl-1">+{cell.moreCount} more</span>}
          </div>
        </div>
      ))}
    </div>
  </div>
)
