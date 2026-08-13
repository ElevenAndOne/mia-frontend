import { useState } from 'react'
import { InlineMd } from './inline-md'
import type { GoldDeliverable } from './types'

// Expected impacts are always the beneficial direction (CTR up, CPM down), so
// both arrows are green in the design — the glyph carries the direction.
const ImpactArrow = ({ direction }: { direction: 'up' | 'down' }) => (
  <svg
    viewBox="0 0 12 12"
    fill="none"
    className="w-3 h-3 shrink-0"
    style={{ color: 'var(--gr-green)' }}
    aria-label={direction === 'up' ? 'increase' : 'decrease'}
  >
    <path
      d={direction === 'up' ? 'M6 10V2M6 2L2.5 5.5M6 2L9.5 5.5' : 'M6 2v8M6 10L2.5 6.5M6 10l3.5-3.5'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const DeliverableTabs = ({ deliverables }: { deliverables: GoldDeliverable[] }) => {
  const [active, setActive] = useState(0)
  const current = deliverables[active]
  if (!current) return null

  return (
    <div>
      <div
        className="flex border-b overflow-x-auto hide-scrollbar"
        style={{ borderColor: 'var(--gr-line)' }}
        role="tablist"
      >
        {deliverables.map((d, i) => {
          const isActive = i === active
          return (
            <button
              key={i}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className="flex items-center gap-2 px-1.5 py-[11px] mr-[22px] -mb-px border-b-2 whitespace-nowrap text-[13.5px] font-semibold transition-colors"
              style={{
                borderColor: isActive ? 'var(--gr-purple)' : 'transparent',
                color: isActive ? 'var(--gr-heading)' : 'var(--gr-muted)',
              }}
            >
              <span
                className="text-[11px] font-semibold rounded-[5px] px-[5px] py-px"
                style={
                  isActive
                    ? {
                        fontFamily: 'var(--gr-mono)',
                        color: 'var(--gr-purple-text)',
                        backgroundColor: 'var(--gr-purple-tint)',
                        border: '1px solid var(--gr-purple-border)',
                      }
                    : {
                        fontFamily: 'var(--gr-mono)',
                        color: 'var(--gr-muted)',
                        backgroundColor: 'var(--gr-surface-2)',
                        border: '1px solid var(--gr-line)',
                      }
                }
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {d.name}
            </button>
          )
        })}
      </div>

      <div className="pt-4 space-y-[14px]">
        <div className="space-y-1.5">
          <h3 className="text-[17px] leading-[26px] font-bold" style={{ color: 'var(--gr-heading)' }}>
            {current.title}
          </h3>
          <p className="text-[13.5px] leading-5 max-w-3xl" style={{ color: 'var(--gr-body)' }}>
            <span className="font-semibold" style={{ color: 'var(--gr-heading)' }}>
              Objective —{' '}
            </span>
            <InlineMd text={current.objective} />
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
          <div className="gr-card py-[18px] px-5">
            <p className="gr-eyebrow mb-2.5">Creative direction</p>
            <ul className="space-y-1.5">
              {current.creative_direction.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className="shrink-0 w-1 h-1 mt-2 rounded-full"
                    style={{ backgroundColor: 'var(--gr-muted)' }}
                  />
                  <span className="text-[13.3px] leading-5" style={{ color: 'var(--gr-body)' }}>
                    <InlineMd text={point} />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="gr-card py-[18px] px-5">
            <p className="gr-eyebrow mb-2.5">Strategy</p>
            <p className="text-[13.3px] leading-5" style={{ color: 'var(--gr-body)' }}>
              <InlineMd text={current.strategy} />
            </p>
          </div>
        </div>

        {current.expected_impact.length > 0 && (
          <div className="gr-card py-[18px] px-5">
            <p className="gr-eyebrow mb-2.5">Expected impact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {current.expected_impact.map((impact, i) => (
                <div
                  key={i}
                  className="gr-inner rounded-[10px] py-2.5 px-[13px] flex items-start gap-[9px]"
                >
                  <span className="mt-1">
                    <ImpactArrow direction={impact.direction} />
                  </span>
                  <div className="space-y-0.5">
                    <p
                      className="text-[12.8px] leading-[15px] font-bold"
                      style={{ color: 'var(--gr-heading)' }}
                    >
                      {impact.kpi}
                    </p>
                    <p className="text-xs leading-[17px]" style={{ color: 'var(--gr-muted)' }}>
                      <InlineMd text={impact.explanation} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
