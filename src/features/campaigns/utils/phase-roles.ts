// Funnel-role label + hue for a phase. The artifacts colour phases by their
// journey role (RACE: Reach=Awareness, Act=Engagement, Convert=Conversion,
// Engage=Loyalty). For generic / custom frameworks we fall back to position so
// non-RACE workspaces still get sensible roles and colours.

const PHASE_HUES = ['#8b6dff', '#4f8cff', '#2bd4a4', '#e879c9']

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
  return PHASE_HUES[sortOrder] ?? PHASE_HUES[PHASE_HUES.length - 1]
}

export function phaseRole(phaseName: string, sortOrder: number): string {
  const race = RACE_ROLES[phaseName.trim().toLowerCase()]
  if (race) return race
  return POSITION_ROLES[sortOrder] ?? 'Phase'
}
