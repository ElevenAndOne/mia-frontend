import { memo } from 'react'
import { parseMarkdownText } from '../utils/markdown'

interface MarkdownTextProps {
  text: string
  className?: string
  metaAdsId?: string
}

/**
 * Renders text with markdown bold, links, and Meta campaign deep links.
 * Memoized to skip re-rendering when text hasn't changed (critical for streaming perf).
 */
export const MarkdownText = memo(function MarkdownText({ text, className = '', metaAdsId }: MarkdownTextProps) {
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
        if (token.type === 'bold') {
          return <strong key={index} className="font-semibold">{token.value}</strong>
        }
        return <span key={index}>{token.value}</span>
      })}
    </span>
  )
})
