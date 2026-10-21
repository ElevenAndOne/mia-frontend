import type { GoldCreativeFinding, GoldStructuredRecommendation } from './types'

// What each payload-driven section actually renders, shared by the component and the
// section eyebrow's count — so a "· 9" never sits over a card that shows 7.

export const MEASURED_KIND = 'pct_vs_portfolio_average'
export const IMPORTANCE_KIND = 'share_of_model_importance_pct'

/** Model-basis findings are left out of "What your own ads show". */
export const shownCreativeFindings = (findings: GoldCreativeFinding[]) =>
  findings.filter((f) => f.evidence_basis !== 'model')

/** Drivers split by what their number means. Kinds this page does not know are kept apart
 *  and shown as given — never dropped, never put on a measured or importance axis. */
export const groupDrivers = (rows: GoldStructuredRecommendation[]) => ({
  measured: rows.filter((r) => r.magnitude_kind === MEASURED_KIND),
  importance: rows.filter((r) => r.magnitude_kind === IMPORTANCE_KIND),
  other: rows.filter(
    (r) => r.magnitude_kind !== MEASURED_KIND && r.magnitude_kind !== IMPORTANCE_KIND
  ),
})
