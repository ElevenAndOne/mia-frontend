import type { CanvasDocument } from '../../services/chat-service'

/**
 * CreativeSpec — the normalized shape every platform preview renders from.
 *
 * v1 source: Mia's labelled-markdown deliverable format (copy, then `---`,
 * then `Label:` production notes — the format create_document already
 * mandates). The markdown `content` stays the single source of truth, so
 * span-patch editing, versions and undo are untouched; this is purely a
 * smarter renderer. Later phases feed the same shape from campaign Asset
 * rows (`details.creative`).
 */

export type PreviewPlatform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'google' | 'email'
export type PreviewFormat =
  | 'static'
  | 'carousel'
  | 'reel'
  | 'story'
  | 'video'
  | 'animation'
  | 'document'
  | 'post_series'
  | 'search_ad'
  | 'pmax'
  | 'display_ad'
  | 'text_ad'
  | 'email'

export interface CreativeNote {
  label: string
  value: string
}

export interface CreativeSpec {
  platform: PreviewPlatform
  format: PreviewFormat
  /** ad_copy → paid chrome (Sponsored, CTA card); social_post → organic chrome. */
  isPaid: boolean
  /** Post copy / caption, markdown markers stripped, newlines preserved. */
  primaryText: string
  /** Hashtag line(s) pulled out of the copy (may be empty). */
  hashtags: string
  headline?: string
  description?: string
  /** RSA/PMax variant pools (Google mixes them) — empty for single-headline formats. */
  headlines: string[]
  descriptions: string[]
  cta?: string
  linkUrl?: string
  /** "Suggested visual" descriptions — one per media slot/slide. */
  visuals: string[]
  /** Uploaded creative image URLs (`Media:` lines) — one per slide; render instead of the placeholder. */
  media: string[]
  /** Remaining production notes (Format, Best time to post, Why this works…). */
  notes: CreativeNote[]
}

export interface CharCheck {
  label: string
  count: number
  limit: number
  /** true = past the limit/fold (rendered as a warning, not an error). */
  over: boolean
}

/** Labels that map onto structured spec fields (lowercased, no trailing colon). */
const FIELD_ALIASES: Record<string, string> = {
  platform: 'platform',
  channel: 'platform',
  format: 'format',
  caption: 'caption',
  copy: 'caption',
  'primary text': 'caption',
  headline: 'headline',
  'ad headline': 'headline',
  // Email deliverables: subject line renders as the headline slot, preheader as
  // the description slot (the inbox mock reads both).
  subject: 'headline',
  'subject line': 'headline',
  preheader: 'description',
  'preview text': 'description',
  description: 'description',
  'link description': 'description',
  cta: 'cta',
  'call to action': 'cta',
  'cta button': 'cta',
  link: 'link',
  url: 'link',
  'final url': 'link',
  'destination url': 'link',
  hashtags: 'hashtags',
  'suggested visual': 'visuals',
  'suggested visuals': 'visuals',
  visual: 'visuals',
  visuals: 'visuals',
  media: 'media',
  image: 'media',
  images: 'media',
}

/** Pull the URL out of a `Media:` value (handles bare URLs and `![alt](url)` / `[text](url)`). */
const extractUrl = (value: string): string | null => {
  const match = value.match(/https?:\/\/[^\s)\]]+/)
  return match ? match[0].replace(/[),.;]+$/, '') : null
}

const HR_LINE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/
/** `**Label:** value`, `- Label: value`, `Label: value` — label kept short so prose survives. */
const LABEL_LINE = /^\s*(?:[-*+]\s+)?(?:\*\*)?([A-Za-z][A-Za-z /]{0,28}?)(?:\*\*)?\s*:\s*(.*)$/
const BULLET_LINE = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/
const HEADING_LINE = /^#{1,6}\s/
/** A line that is (mostly) hashtags, e.g. `#DutoitAgri #Apples #Heritage`. */
const HASHTAG_LINE = /^\s*(#[A-Za-z0-9_]+\s*){2,}$/

const stripInlineMarkdown = (text: string): string =>
  text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\s)\*(?!\s)(.+?)\*(?=\s|$|[.,!?])/g, '$1$2')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\((.*?)\)/g, '$1')

/** Also drops unmatched bold markers left behind by `**Label:** value` lines. */
const cleanValue = (value: string): string =>
  stripInlineMarkdown(value)
    .replace(/^[*_]+\s*/, '')
    .replace(/\s*[*_]+$/, '')
    .trim()

const detectPlatform = (hint: string): PreviewPlatform | null => {
  const h = hint.toLowerCase()
  if (/google|search ad|responsive search|\brsa\b|pmax|display ad|display network/.test(h))
    return 'google'
  if (/linkedin/.test(h)) return 'linkedin'
  if (/tiktok/.test(h)) return 'tiktok'
  if (/\bemail\b|newsletter/.test(h)) return 'email'
  if (/instagram|\big\b|reel|story|stories/.test(h)) return 'instagram'
  if (/facebook|\bfb\b|meta/.test(h)) return 'facebook'
  return null
}

const detectFormat = (hint: string): PreviewFormat | null => {
  const h = hint.toLowerCase()
  if (/pmax|performance max/.test(h)) return 'pmax'
  if (/display/.test(h)) return 'display_ad'
  if (/text ad|text_ad/.test(h)) return 'text_ad'
  if (/\bemail\b|newsletter/.test(h)) return 'email'
  if (/search/.test(h)) return 'search_ad'
  if (/carousel/.test(h)) return 'carousel'
  if (/reel/.test(h)) return 'reel'
  if (/story|stories/.test(h)) return 'story'
  if (/animat|\bgif\b/.test(h)) return 'animation'
  if (/document|\bpdf\b|slide deck|\bdeck\b/.test(h)) return 'document'
  if (/post[ _-]?series|\bthread\b/.test(h)) return 'post_series'
  if (/video/.test(h)) return 'video'
  if (/static|single|image|photo/.test(h)) return 'static'
  return null
}

const titleCase = (label: string): string =>
  label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()

/**
 * Parse a canvas document into a CreativeSpec, or null when the doc isn't a
 * social/ad deliverable (or the copy can't be found) — callers fall back to
 * the markdown renderer.
 */
export const parseCreativeSpec = (doc: CanvasDocument): CreativeSpec | null => {
  if (doc.doc_type !== 'social_post' && doc.doc_type !== 'ad_copy' && doc.doc_type !== 'email')
    return null

  const lines = doc.content.split('\n')
  const fields: Record<string, string> = {}
  const visuals: string[] = []
  const media: string[] = []
  const headlines: string[] = []
  const descriptions: string[] = []
  const notes: CreativeNote[] = []
  const copyLines: string[] = []
  const hashtagLines: string[] = []

  let inNotes = false
  let collectingVisuals = false
  let collectingMedia = false
  /** Set once a `Caption:` label is seen — following unlabelled copy-section lines append to it. */
  let captionOpen = false

  for (const rawLine of lines) {
    if (HR_LINE.test(rawLine)) {
      inNotes = true
      collectingVisuals = false
      collectingMedia = false
      captionOpen = false
      continue
    }

    const labelMatch = rawLine.match(LABEL_LINE)
    const label = labelMatch ? labelMatch[1].trim().toLowerCase() : null
    const field = label ? FIELD_ALIASES[label] : undefined

    if (field) {
      collectingVisuals = false
      collectingMedia = false
      captionOpen = false
      if (field === 'media') {
        // Raw value, not cleanValue — markdown-link stripping would eat the URL.
        const url = extractUrl(labelMatch![2])
        if (url) media.push(url)
        collectingMedia = true
        continue
      }
      const value = cleanValue(labelMatch![2])
      if (field === 'visuals') {
        if (value) visuals.push(value)
        collectingVisuals = true
      } else if (field === 'caption') {
        if (value) copyLines.push(value)
        captionOpen = true
      } else if (field === 'headline' || field === 'description') {
        // RSA/PMax deliverables repeat these labels — collect every variant.
        // Strip any "(22)"-style char-count suffix the model appends.
        const variant = value.replace(/\s*\(\d+\)\s*$/, '')
        if (variant) (field === 'headline' ? headlines : descriptions).push(variant)
        if (!fields[field]) fields[field] = variant
      } else if (!fields[field]) {
        fields[field] = value
      }
      continue
    }

    if (collectingVisuals) {
      const bullet = rawLine.match(BULLET_LINE)
      if (bullet) {
        visuals.push(cleanValue(bullet[1]))
        continue
      }
      if (rawLine.trim()) collectingVisuals = false
    }

    if (collectingMedia) {
      const bullet = rawLine.match(BULLET_LINE)
      if (bullet) {
        const url = extractUrl(bullet[1])
        if (url) media.push(url)
        continue
      }
      if (rawLine.trim()) collectingMedia = false
    }

    if (inNotes) {
      // Unrecognized labelled lines in the notes section become production notes.
      // Bullet lines under a label fold into that note's value ("Recommended
      // sizes:" followed by one bullet per size) instead of being dropped.
      const noteBullet = rawLine.match(BULLET_LINE)
      if (noteBullet && !labelMatch && notes.length > 0) {
        const item = cleanValue(noteBullet[1])
        if (item) {
          const parent = notes[notes.length - 1]
          parent.value = parent.value ? `${parent.value} · ${item}` : item
        }
        continue
      }
      if (labelMatch) {
        notes.push({ label: titleCase(labelMatch[1].trim()), value: cleanValue(labelMatch[2]) })
      }
      continue
    }

    // Copy section.
    if (HEADING_LINE.test(rawLine)) continue
    if (HASHTAG_LINE.test(rawLine)) {
      hashtagLines.push(rawLine.trim())
      continue
    }
    if (captionOpen || copyLines.length > 0 || rawLine.trim()) {
      copyLines.push(stripInlineMarkdown(rawLine))
    }
  }

  let primaryText = copyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  const hint = `${fields.platform ?? ''} ${doc.title} ${fields.format ?? ''} ${doc.content.slice(0, 400)}`
  const platform: PreviewPlatform =
    doc.doc_type === 'email'
      ? 'email'
      : (detectPlatform(fields.platform ?? '') ?? detectPlatform(hint) ?? 'facebook')
  const detected = detectFormat(fields.format ?? '') ?? detectFormat(hint)
  const format: PreviewFormat =
    platform === 'email'
      ? 'email'
      : platform === 'google'
        ? detected === 'display_ad'
          ? 'display_ad'
          : detected === 'pmax'
            ? 'pmax'
            : 'search_ad'
        : (detected ?? 'static')

  // Resilience: despite the prompt, the model often writes RSA/PMax variants as
  // a numbered list in the copy instead of repeated 'Headline:' labels. For
  // Google docs with no labelled pool, lift numbered items out of the copy:
  // short ones are headlines, long ones descriptions/long-headlines.
  if (platform === 'google' && headlines.length === 0 && descriptions.length === 0) {
    const lifted: { short: string[]; long: string[] } = { short: [], long: [] }
    const kept: string[] = []
    for (const line of primaryText.split('\n')) {
      const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/)
      if (numbered) {
        const item = numbered[1].trim().replace(/\s*\(\d+\)\s*$/, '')
        if (item) (item.length <= 30 ? lifted.short : lifted.long).push(item)
        continue
      }
      kept.push(line)
    }
    // Only treat it as a variant pool when it plausibly is one.
    if (lifted.short.length >= 3) {
      headlines.push(...lifted.short)
      descriptions.push(...lifted.long)
      primaryText = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    }
  }

  const spec: CreativeSpec = {
    platform,
    format,
    isPaid: doc.doc_type === 'ad_copy',
    primaryText,
    hashtags: hashtagLines.join(' '),
    headline: fields.headline || headlines[0] || undefined,
    description: fields.description || descriptions[0] || undefined,
    headlines,
    descriptions,
    cta: fields.cta || undefined,
    linkUrl: fields.link || undefined,
    visuals,
    media,
    // A label whose bullets never arrived renders as a dangling "Label:" — drop it.
    notes: notes.filter((n) => n.value),
  }

  // Not enough to draw anything faithful → let the markdown renderer handle it.
  if (!spec.primaryText && !(platform === 'google' && (spec.headline || spec.headlines.length)))
    return null

  return spec
}

/** Platform copy limits, rendered as count chips under the preview. */
export const charChecks = (spec: CreativeSpec): CharCheck[] => {
  const checks: CharCheck[] = []
  const caption = spec.primaryText

  if (spec.platform === 'email') {
    if (spec.headline) {
      // ~60 chars is where most inbox clients truncate the subject.
      checks.push({ label: 'Subject', count: spec.headline.length, limit: 60, over: spec.headline.length > 60 })
    }
    if (spec.description) {
      checks.push({
        label: 'Preheader',
        count: spec.description.length,
        limit: 90,
        over: spec.description.length > 90,
      })
    }
    return checks
  }

  if (spec.format === 'text_ad') {
    // LinkedIn text ads: headline 25, description 75.
    if (spec.headline) {
      checks.push({ label: 'Headline', count: spec.headline.length, limit: 25, over: spec.headline.length > 25 })
    }
    if (spec.description) {
      checks.push({
        label: 'Description',
        count: spec.description.length,
        limit: 75,
        over: spec.description.length > 75,
      })
    }
    return checks
  }

  if (spec.platform === 'google') {
    // RSA/PMax pools: count chips here, per-variant limits shown in the preview list.
    if (spec.headlines.length > 1) {
      checks.push({
        label: 'Headlines',
        count: spec.headlines.length,
        limit: 15,
        over: spec.headlines.length > 15,
      })
      checks.push({
        label: 'Descriptions',
        count: spec.descriptions.length,
        limit: 4,
        over: spec.descriptions.length > 4,
      })
      return checks
    }
    if (spec.headline) {
      checks.push({ label: 'Headline', count: spec.headline.length, limit: 30, over: spec.headline.length > 30 })
    }
    if (spec.description) {
      checks.push({
        label: 'Description',
        count: spec.description.length,
        limit: 90,
        over: spec.description.length > 90,
      })
    }
    return checks
  }

  if (caption) {
    // 125 chars is where feed copy truncates behind "See more".
    checks.push({ label: 'Copy · fold', count: caption.length, limit: 125, over: caption.length > 125 })
  }
  if (spec.isPaid && spec.headline) {
    checks.push({ label: 'Headline', count: spec.headline.length, limit: 40, over: spec.headline.length > 40 })
  }
  if (spec.isPaid && spec.description) {
    checks.push({
      label: 'Description',
      count: spec.description.length,
      limit: 30,
      over: spec.description.length > 30,
    })
  }
  return checks
}

export const PLATFORM_LABELS: Record<PreviewPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  google: 'Google',
  email: 'Email',
}

/** `dutoit.com` from a full URL, for the FB link card / Google source line. */
export const displayDomain = (url?: string): string => {
  if (!url) return 'yoursite.com'
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url.split('/')[0]
  }
}
