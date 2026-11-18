import SiteGuidesView from '../features/site-guides/site-guides-view'

// Internal-only: build, check and download a brand guide for a business with no website.
// Access is enforced server-side by the staff allowlist (the same one as Mia Pulse); the frontend
// only requires a signed-in session. See docs2/BASIC_WEBSITES_BRAND_GUIDE_PLAN_2026-11-18.md in
// mia-backend.
const InternalSiteGuidesPage = () => <SiteGuidesView />

export default InternalSiteGuidesPage
