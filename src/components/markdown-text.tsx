interface MarkdownTextProps {
  text: string
  className?: string
  metaAdsId?: string
}

/**
 * Renders text with markdown links and Meta campaign deep links
 */
export function MarkdownText({ text, className = '', metaAdsId }: MarkdownTextProps) {
  const convertDeepLink = (linkUrl: string): string => {
    if (linkUrl.startsWith('DEEPLINK:')) {
      const campaignId = linkUrl.replace('DEEPLINK:', '').trim()
      if (/^\d{13,}$/.test(campaignId) && metaAdsId) {
        return `https://business.facebook.com/adsmanager/manage/campaigns?act=${metaAdsId}&selected_campaign_ids=${campaignId}`
      }
      return ''
    }
    return linkUrl
  }

  // Convert "- " at start of lines to bullet points
  const convertBullets = (str: string): string => {
    return str.replace(/^- /gm, '\u2022 ').replace(/\n- /g, '\n\u2022 ')
  }

  // Strip out any marker tags that might briefly appear
  const stripMarkers = (str: string): string => {
    return str
      .replace(/\[Title\]:/g, '')
      .replace(/\[Insight\]:/g, '')
      .replace(/\[Interpretation\]:/g, '')
      .replace(/\[Action\]:/g, '')
      .trim()
  }

  const renderWithLinks = (text: string) => {
    const cleanText = stripMarkers(text)
    const bulletText = convertBullets(cleanText)
    const parts = bulletText.split(/(\[.*?\]\((?:https?:\/\/.*?|DEEPLINK:.*?)\)|https?:\/\/[^\s]+)/)
    return parts.map((part, index) => {
      const linkMatch = part.match(/\[(.*?)\]\(((?:https?:\/\/|DEEPLINK:).*?)\)/)
      if (linkMatch) {
        const [, linkText, linkUrl] = linkMatch
        const actualUrl = convertDeepLink(linkUrl)
        if (!actualUrl) {
          return <span key={index}>{linkText}</span>
        }
        return (
          <a
            key={index}
            href={actualUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {linkText}
          </a>
        )
      }
      if (part.match(/^https?:\/\//)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {part}
          </a>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  return <span className={className}>{renderWithLinks(text)}</span>
}
