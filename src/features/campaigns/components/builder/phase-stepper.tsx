import { phaseHue, phaseRole } from '../../utils/phase-roles'
import type { Phase } from '../../types'

interface PhaseStepperProps {
  phases: Phase[]
  selectedId: string
  onSelect: (phaseId: string) => void
}

// Numbered phase tabs (Reach / Act / Convert / Engage or custom). Active tab is
// tinted with the phase hue.
export const PhaseStepper = ({ phases, selectedId, onSelect }: PhaseStepperProps) => (
  <div className="flex gap-2.5">
    {phases.map((phase, i) => {
      const active = phase.phase_id === selectedId
      const hue = phaseHue(phase.sort_order ?? i)
      const num = String(i + 1).padStart(2, '0')
      return (
        <button
          key={phase.phase_id}
          onClick={() => onSelect(phase.phase_id)}
          className="flex-1 text-left rounded-xl border px-4 py-3 transition-colors"
          style={{
            borderColor: active ? hue : 'var(--color-border-secondary)',
            background: active ? `color-mix(in srgb, ${hue} 14%, transparent)` : 'var(--color-background-secondary)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="cw-mono text-xs font-semibold" style={{ color: active ? hue : 'var(--color-text-quaternary)' }}>{num}</span>
            <span className={`paragraph-sm font-semibold ${active ? 'text-primary' : 'text-secondary'}`}>{phase.phase_name}</span>
          </div>
          <div className="paragraph-xs text-quaternary mt-1">{phaseRole(phase.phase_name, phase.sort_order ?? i)}</div>
        </button>
      )
    })}
  </div>
)
