// Funnel-role label + hue for a phase. The artifacts colour phases by their
// journey role (RACE: Reach=Awareness, Act=Engagement, Convert=Conversion,
// Engage=Loyalty). For generic / custom frameworks we fall back to position so
// non-RACE workspaces still get sensible roles and colours.

// New-palette journey hues: periwinkle · turquoise · golden · rose
const PHASE_HUES = ['#8398CA', '#44B8AB', '#F4C247', '#E499BA']

// RACE phase name → role label (case-insensitive)
const RACE_ROLES: Record<string, string> = {
  reach: 'Awareness',
  act: 'Engagement',
  convert: 'Conversion',
  engage: 'Loyalty',
}

// Generic position → role label fallback
const POSITION_ROLES = ['Awareness', 'Engagement', 'Conversion', 'Loyalty']

export function phaseHue(sortOrder: number): string {
  // Returns a CSS var (live-editable in the theme editor) with the palette hex
  // as a built-in fallback, so it renders correctly even without an override.
  const i = sortOrder >= 0 && sortOrder < PHASE_HUES.length ? sortOrder : PHASE_HUES.length - 1
  return `var(--ui-phase-${i}, ${PHASE_HUES[i]})`
}

export function phaseRole(phaseName: string, sortOrder: number): string {
  const race = RACE_ROLES[phaseName.trim().toLowerCase()]
  if (race) return race
  return POSITION_ROLES[sortOrder] ?? 'Phase'
}
