import HouseRulesView from '../features/house-rules/house-rules-view'

// Hidden page for the agency's house rules (the slop list, platform facts): no menu link. Access is enforced
// server-side by the HOUSE_RULES_EMAILS allowlist; the frontend only requires a signed-in session.
// See docs2/SKILL_IDEAS_INTEGRATION_MAP_2026-11-17.md in mia-backend.
const InternalHouseRulesPage = () => <HouseRulesView />

export default InternalHouseRulesPage
