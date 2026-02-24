export type MarkdownToken =
  | { type: 'text'; value: string }
  | { type: 'link'; text: string; url: string }

const MARKER_TAGS = [
  '[Title]:',
  '[Insight]:',
  '[Interpretation]:',
  '[Action]:'
]

const stripMarkers = (input: string): string => {
  let output = input
  for (const tag of MARKER_TAGS) {
    output = output.replace(new RegExp(tag, 'g'), '')
  }
  return output.trim()
}

const convertBullets = (input: string): string => {
  return input.replace(/^- /gm, '\u2022 ').replace(/\n- /g, '\n\u2022 ')
}

const convertDeepLink = (linkUrl: string, metaAdsId?: string): string => {
  if (linkUrl.startsWith('DEEPLINK:')) {
    const campaignId = linkUrl.replace('DEEPLINK:', '').trim()
    if (/^\d{13,}$/.test(campaignId) && metaAdsId) {
      return `https://business.facebook.com/adsmanager/manage/campaigns?act=${metaAdsId}&selected_campaign_ids=${campaignId}`
    }
    return ''
  }
  return linkUrl
}

export function parseMarkdownText(input: string, metaAdsId?: string): MarkdownToken[] {
  const cleanText = stripMarkers(input)
  const bulletText = convertBullets(cleanText)

  // Prevent hyperlink bleeding and nested brackets
  const parts = bulletText.split(
    /(\[[^\[\]]+\]\((?:https?:\/\/[^)]+|DEEPLINK:[^)]+)\)|https?:\/\/[^\s]+)/
  )

  return parts.map((part) => {
    const linkMatch = part.match(/\[([^\[\]]+)\]\(((?:https?:\/\/|DEEPLINK:)[^)]+)\)/)
    if (linkMatch) {
      const [, linkText, linkUrl] = linkMatch
      const actualUrl = convertDeepLink(linkUrl, metaAdsId)
      if (!actualUrl) {
        return { type: 'text', value: linkText }
      }
      return { type: 'link', text: linkText, url: actualUrl }
    }

    if (part.match(/^https?:\/\//)) {
      return { type: 'link', text: part, url: part }
    }

    return { type: 'text', value: part }
  })
}
