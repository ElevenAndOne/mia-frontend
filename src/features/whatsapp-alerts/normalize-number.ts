/**
 * Normalize a user-entered phone number to E.164 (e.g. +27711644526) for WhatsApp/Twilio.
 *
 * Twilio rejects anything that isn't valid E.164 — notably "+0711644526" (a national
 * number with a "+" bolted on), which is the mistake this guards against.
 *
 * Rules:
 *   0711644526      -> +27711644526   (national format: leading 0 -> default country code)
 *   +0711644526     -> +27711644526   (stray "+" before a national 0)
 *   0027711644526   -> +27711644526   ("00" international prefix -> "+")
 *   27711644526     -> +27711644526   (country code, no "+")
 *   +27711644526    -> +27711644526   (already E.164 — kept as-is)
 *
 * DEFAULT_COUNTRY_CODE is South Africa (matches TWILIO_WHATSAPP_FROM / the SAST product).
 * If Mia goes multi-region, make this per-workspace instead of a constant.
 */
const DEFAULT_COUNTRY_CODE = '27' // South Africa

export function normalizeWhatsAppNumber(raw: string): string {
  if (!raw) return ''

  // Keep only digits and a leading "+"
  let s = raw.trim().replace(/[^\d+]/g, '')
  if (!s) return ''

  // "00" international prefix -> "+"
  if (s.startsWith('00')) s = '+' + s.slice(2)

  // "+0…" is a national number with a stray "+" — drop the "+" so the 0-rule applies
  if (s.startsWith('+0')) s = s.slice(1)

  // Already E.164-ish
  if (s.startsWith('+')) return s

  // National format (leading 0) -> replace 0 with the default country code
  if (s.startsWith('0')) return '+' + DEFAULT_COUNTRY_CODE + s.slice(1)

  // Bare country code (e.g. 27…) or any other digits -> just add "+"
  return '+' + s
}
