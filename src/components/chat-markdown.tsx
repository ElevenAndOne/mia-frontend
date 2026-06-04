import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMarkdownProps {
  content: string
  className?: string
}

export const ChatMarkdown = memo(function ChatMarkdown({ content, className = '' }: ChatMarkdownProps) {
  return (
    <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-tertiary border-b border-tertiary">{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-tertiary last:border-0">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="text-left px-3 py-2 font-semibold text-primary text-xs uppercase tracking-wide">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-secondary">{children}</td>
        ),
        // Headings
        h1: ({ children }) => <h1 className="text-lg font-bold text-primary mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold text-primary mt-3 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-primary mt-2 mb-1">{children}</h3>,
        // Lists
        ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-secondary">{children}</li>,
        // Inline
        strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children, className: codeClass }) => {
          const isBlock = codeClass?.includes('language-')
          return isBlock ? (
            <code className="block bg-quaternary rounded px-3 py-2 text-xs font-mono whitespace-pre-wrap break-words">
              {children}
            </code>
          ) : (
            <code className="bg-quaternary rounded px-1 py-0.5 text-xs font-mono break-words">{children}</code>
          )
        },
        pre: ({ children }) => <pre className="my-2 whitespace-pre-wrap break-words">{children}</pre>,
        // Paragraphs and links
        p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-utility-info-600 hover:text-utility-info-700 underline font-medium"
          >
            {children}
          </a>
        ),
        // Horizontal rule
        hr: () => <hr className="my-3 border-tertiary" />,
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-tertiary pl-3 my-2 text-secondary italic">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  )
})