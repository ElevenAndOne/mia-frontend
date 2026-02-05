import { parseMarkdownText } from '../utils/markdown'

interface MarkdownTextProps {
  text: string
  className?: string
  metaAdsId?: string
}

/**
 * Renders text with markdown links and Meta campaign deep links
 */
export function MarkdownText({ text, className = '', metaAdsId }: MarkdownTextProps) {
  const tokens = parseMarkdownText(text, metaAdsId)
  return (
    <span className={className}>
      {tokens.map((token, index) => {
        if (token.type === 'link') {
          return (
            <a
              key={index}
              href={token.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-utility-info-600 hover:text-utility-info-700 underline font-medium"
            >
              {token.text}
            </a>
          )
        }
        return <span key={index}>{token.value}</span>
      })}
    </span>
  )
}
