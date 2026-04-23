import { EXTERNAL_URLS } from '../constants/external-urls'

export type MarkdownToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'link'; text: string; url: string }

const MARKER_TAGS = ['[Title]:', '[Insight]:', '[Interpretation]:', '[Action]:']

const stripMarkers = (input: string): string => {
  let output = input
  for (const tag of MARKER_TAGS) {
    output = output.replace(new RegExp(tag.replace(/[[\]]/g, '\\$&'), 'g'), '')
  }
  return output.trim()
}

const convertBullets = (input: string): string => {
  return input.replace(/^- /gm, '\u2022 ').replace(/\n- /g, '\n\u2022 ')
}

/**
 * Normalize common malformed URL patterns from AI output:
 * - "http//example.com" → "http://example.com"
 * - "https//example.com" → "https://example.com"
 */
const normalizeUrl = (url: string): string => {
  return url.replace(/^http\/\//, 'http://').replace(/^https\/\//, 'https://')
}

const convertDeepLink = (linkUrl: string, metaAdsId?: string): string => {
  if (linkUrl.startsWith('DEEPLINK:')) {
    const campaignId = linkUrl.replace('DEEPLINK:', '').trim()
    if (/^\d{13,}$/.test(campaignId) && metaAdsId) {
      return `${EXTERNAL_URLS.META_ADS_MANAGER_BASE}?act=${metaAdsId}&selected_campaign_ids=${campaignId}`
    }
    return ''
  }
  return normalizeUrl(linkUrl)
}

export function parseMarkdownText(input: string, metaAdsId?: string): MarkdownToken[] {
  const cleanText = stripMarkers(input)
  const bulletText = convertBullets(cleanText)

  // Split on bold (**text**) and markdown links [text](url) and bare URLs
  // Also handle malformed http// URLs (missing colon)
  const parts = bulletText.split(
    /(\*\*[^*]+\*\*|\[[^[\]]+\]\((?:https?:\/\/[^)]+|https?\/\/[^)]+|DEEPLINK:[^)]+)\)|https?:\/\/[^\s)]+|https?\/\/[^\s)]+)/
  )

  return parts.filter(Boolean).flatMap((part): MarkdownToken[] => {
    // Bold: **text**
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/)
    if (boldMatch) {
      return [{ type: 'bold', value: boldMatch[1] }]
    }

    // Markdown link: [text](url)
    const linkMatch = part.match(/^\[([^[\]]+)\]\(((?:https?:\/\/|https?\/\/|DEEPLINK:)[^)]+)\)$/)
    if (linkMatch) {
      const [, linkText, linkUrl] = linkMatch
      const actualUrl = convertDeepLink(linkUrl, metaAdsId)
      if (!actualUrl) {
        return [{ type: 'text', value: linkText }]
      }
      return [{ type: 'link', text: linkText, url: actualUrl }]
    }

    // Bare URL (including malformed http// variants)
    if (/^https?:\/\//.test(part) || /^https?\/\//.test(part)) {
      const url = normalizeUrl(part)
      return [{ type: 'link', text: url, url }]
    }

    return [{ type: 'text', value: part }]
  })
}
