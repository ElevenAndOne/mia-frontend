export type HealthState = 'reconnect' | 'no_spend' | 'not_active' | 'no_access'

export interface IntegrationHealth {
  state: HealthState
  detail: string
}

const STYLES: Record<HealthState, { label: string; className: string }> = {
  // Red: something is broken and data has stopped.
  reconnect: {
    label: 'Reconnect',
    className: 'text-utility-error-600 bg-utility-error-50 border-utility-error-200',
  },
  // Red: the platform itself has switched the ad account off (Google deactivated it).
  not_active: {
    label: 'Not active',
    className: 'text-utility-error-600 bg-utility-error-50 border-utility-error-200',
  },
  // Red: Mia's login can no longer see the ad account (unlinked, or the user was removed).
  no_access: {
    label: 'No access',
    className: 'text-utility-error-600 bg-utility-error-50 border-utility-error-200',
  },
  // Amber: working as intended, but not what the user probably expects.
  no_spend: {
    label: 'No spend',
    className: 'text-utility-warning-600 bg-utility-warning-50 border-utility-warning-200',
  },
}

/**
 * One pill per integration row, rendered only when something needs saying — so a
 * healthy workspace looks exactly as it did before. Colour carries the triage and
 * the explanation lives in the tooltip, keeping the row scannable.
 */
export const HealthPill = ({ health }: { health: IntegrationHealth }) => {
  const style = STYLES[health.state]
  if (!style) return null
  return (
    <span
      title={health.detail}
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.6563rem] font-semibold uppercase tracking-[0.04em] ${style.className}`}
    >
      {style.label}
    </span>
  )
}
