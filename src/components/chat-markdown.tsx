import { memo, useMemo, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMarkdownProps {
  content: string
  className?: string
}

// Hoisted to module scope: recreating this object per render gave react-markdown
// a new `components` identity every time, forcing it to rebuild the whole element
// tree — expensive at 25 renders/sec while a reply streams.
const REMARK_PLUGINS = [remarkGfm]
const MARKDOWN_COMPONENTS: Components = {
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
  tr: ({ children }) => <tr className="border-b border-tertiary last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="text-left px-3 py-2 font-semibold text-primary text-xs uppercase tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-secondary">{children}</td>,
  // Headings
  h1: ({ children }) => <h1 className="text-lg font-bold text-primary mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-primary mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-primary mt-2 mb-1">{children}</h3>
  ),
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
      <code className="bg-quaternary rounded px-1 py-0.5 text-xs font-mono break-words">
        {children}
      </code>
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
}

// "## Campaign thinking" sections (the FACT/INSIGHT/… evidence behind a plan) render
// collapsed: the verdict stays visible in the message; the working is one click away.
// A section runs from its heading to a lone `---`, the next `##` heading, or the end.
// The model occasionally emits a whole markdown table on ONE line ("| Ad | Format | |---|---|
// | Ad 1 | Carousel |") which renders as pipe soup. Reflow: a line containing a |---| header
// separator gets split back into rows at every "| |" boundary.
function reflowFlatTables(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      if (!/\|\s*-{2,}\s*\|/.test(line) || !/\|\s+\|/.test(line)) return line
      return line.replace(/\|\s+\|/g, '|\n|')
    })
    .join('\n')
}

// The model sometimes glues a thematic break straight onto a heading ("---## Meta Ads"),
// which markdown renders as literal text. Split them back onto their own lines.
function unglueDividerHeadings(content: string): string {
  return content.replace(/^(-{3,})(#{1,6}\s)/gm, '$1\n\n$2')
}

const THINKING_HEADING = /^#{2,3}\s*campaign thinking\b.*$/im

type Segment = { collapsible: boolean; text: string }

function splitThinking(content: string): Segment[] {
  const match = THINKING_HEADING.exec(content)
  if (!match) return [{ collapsible: false, text: content }]
  const start = match.index
  const afterHeading = start + match[0].length
  const rest = content.slice(afterHeading)
  const endRel = rest.search(/^---\s*$|^#{1,2}\s+(?!#)/m)
  const end = endRel === -1 ? content.length : afterHeading + endRel
  const segments: Segment[] = []
  if (content.slice(0, start).trim())
    segments.push({ collapsible: false, text: content.slice(0, start) })
  segments.push({ collapsible: true, text: content.slice(start, end) })
  if (content.slice(end).trim()) segments.push(...splitThinking(content.slice(end)))
  return segments
}

const ThinkingSection = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-2 rounded-lg border border-tertiary overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left paragraph-xs text-secondary hover:bg-tertiary transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">Why Mia suggests this</span>
        <span className="text-quaternary">— the data behind the plan</span>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-tertiary">
          <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
            {text}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export const ChatMarkdown = memo(function ChatMarkdown({
  content,
  className = '',
}: ChatMarkdownProps) {
  const segments = useMemo(() => splitThinking(unglueDividerHeadings(reflowFlatTables(content))), [content])
  return (
    <div className={className}>
      {segments.map((seg, i) =>
        seg.collapsible ? (
          <ThinkingSection key={i} text={seg.text} />
        ) : (
          <ReactMarkdown key={i} remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
            {seg.text}
          </ReactMarkdown>
        )
      )}
    </div>
  )
})
