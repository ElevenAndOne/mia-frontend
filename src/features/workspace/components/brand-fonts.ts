/** Their own fonts (services/brand_fonts): shared by the Brand tab and the guide review. */

export interface FontStatus {
  role: 'headline' | 'body' | 'print'
  name: string
  status: 'yours' | 'free' | 'paid'
  stand_in?: string | null
}

export interface OwnFont {
  id: string
  family: string
  weight: number
  italic: boolean
  filename: string | null
}

export const FONT_WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
}

export const fontList = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`

/**
 * "Your brand uses Gotham, a paid font. Upload your font files and Mia uses them. Until then she
 * uses Montserrat, the closest free match." Null when every font they name can be drawn as is.
 */
export const paidFontsLine = (status: FontStatus[] | undefined, from = 'Your brand') => {
  const paid = (status ?? []).filter((s) => s.status === 'paid')
  if (!paid.length) return null
  const names = paid.map((s) => s.name)
  const matches = [...new Set(paid.map((s) => s.stand_in).filter((s): s is string => !!s))]
  const until = matches.length
    ? `Until then Mia uses ${fontList(matches)}, the closest free ${matches.length > 1 ? 'matches' : 'match'}.`
    : 'Until then Mia uses her own headline font.'
  return `${from} uses ${fontList(names)}, ${paid.length > 1 ? 'which are paid fonts' : 'a paid font'}. Upload your font files and Mia uses them. ${until}`
}
