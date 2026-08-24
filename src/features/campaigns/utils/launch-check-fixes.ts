// What can be fixed from the checklist row itself, per check code.
//
// The point of the readiness screen is that you don't leave it. A row that says
// "must fix" and nothing else sends someone hunting for the right ad card — so
// every check whose cause is a field WE own gets an input here. Checks that need
// the ad platform (a dead account, a pixel that isn't firing, missing conversion
// tracking) can't be fixed from Mia at all, and those keep Accept / must fix.

export type FixKind =
  | 'text'
  | 'lines'
  | 'budget'
  | 'date'
  | 'select'
  | 'ready'
  | 'connect'
  | 'rsa'

/** Which existing Integrations picker a 'connect' fix opens. */
export type SelectorName = 'meta_account' | 'facebook_page' | 'google_account'

export interface FixSpec {
  /** Where the value is written: the ads the check points at, or the channel. */
  target: 'asset' | 'channel' | 'push_config'
  field: string
  kind: FixKind
  cta: string
  placeholder?: string
  hint?: string
  options?: { value: string; label: string }[]
  /** Offer to run the value through the campaign's UTM builder before saving. */
  taggable?: boolean
  /** For kind 'connect': the Integrations picker to open. */
  selector?: SelectorName
}

import { CHANNEL_FIX_SPECS } from './launch-check-fix-specs-channel'
import { FIX_SPECS as ASSET_FIX_SPECS } from './launch-check-fix-specs'
import { PLATFORM_FIX_SPECS } from './launch-check-fix-specs-platform'

/** Every non-platform-specific fix, whether it writes to an ad or the channel. */
export const FIX_SPECS: Record<string, FixSpec> = { ...ASSET_FIX_SPECS, ...CHANNEL_FIX_SPECS }
export { PLATFORM_FIX_SPECS }


/** Platform-specific spec first, then the shared table. */
export function specFor(platform: string, code: string): FixSpec | undefined {
  return PLATFORM_FIX_SPECS[platform]?.[code] ?? FIX_SPECS[code]
}


/** Split a textarea into the array/newline shape the backend field expects. */
export function parseLines(field: string, raw: string): unknown {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  // deliverable_url is stored as newline-separated text; keywords as a list.
  return field === 'deliverable_url' ? lines.join('\n') : lines
}

export const hasUtm = (url: string) => /[?&]utm_/i.test(url)
