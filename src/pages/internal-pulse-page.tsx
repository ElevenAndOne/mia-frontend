import PulseView from '../features/pulse/pulse-view'

// Internal-only beta-usage dashboard ("Mia Pulse"). Access is enforced server-side by
// the PULSE_ADMIN_EMAILS allowlist; the frontend only requires an authenticated session.
// See docs/BETA_USAGE_ANALYTICS_PLAN.md in mia-backend.
const InternalPulsePage = () => <PulseView />

export default InternalPulsePage
